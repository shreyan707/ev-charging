const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EVCharging Contract", function () {
  let evCharging;
  let owner;
  let stationOwner;
  let user1;
  let user2;
  const basePricePerWh = 1000000000n; // 1 Gwei per Wh

  beforeEach(async function () {
    [owner, stationOwner, user1, user2] = await ethers.getSigners();
    
    // Deploy EVCharging contract
    const EVChargingFactory = await ethers.getContractFactory("EVCharging");
    evCharging = await EVChargingFactory.deploy();
    await evCharging.waitForDeployment();
  });

  describe("Station Registration", function () {
    it("should allow a station owner to register a station", async function () {
      const tx = await evCharging.connect(stationOwner).registerStation(
        "VIT Campus Charger 1",
        "12.9716,79.1594",
        basePricePerWh
      );
      await tx.wait();

      const stationCount = await evCharging.stationCount();
      expect(stationCount).to.equal(1n);

      const station = await evCharging.stations(1);
      expect(station.name).to.equal("VIT Campus Charger 1");
      expect(station.coordinates).to.equal("12.9716,79.1594");
      expect(station.owner).to.equal(stationOwner.address);
      expect(station.basePricePerWh).to.equal(basePricePerWh);
      expect(station.active).to.be.true;
    });

    it("should revert if station registration inputs are invalid", async function () {
      await expect(
        evCharging.connect(stationOwner).registerStation("", "12.9716,79.1594", basePricePerWh)
      ).to.be.revertedWith("Station name cannot be empty");

      await expect(
        evCharging.connect(stationOwner).registerStation("Station 1", "", basePricePerWh)
      ).to.be.revertedWith("Coordinates cannot be empty");

      await expect(
        evCharging.connect(stationOwner).registerStation("Station 1", "12.9716,79.1594", 0)
      ).to.be.revertedWith("Base price must be greater than zero");
    });
  });

  describe("Slot Booking & Overlap Detection", function () {
    let stationId;

    beforeEach(async function () {
      const tx = await evCharging.connect(stationOwner).registerStation(
        "VIT Campus Charger 1",
        "12.9716,79.1594",
        basePricePerWh
      );
      await tx.wait();
      stationId = 1n;
    });

    it("should allow a user to book a valid slot", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const duration = 3600; // 1 hour

      const tx = await evCharging.connect(user1).bookSlot(stationId, startTime, duration);
      await tx.wait();

      const sessionCount = await evCharging.sessionCount();
      expect(sessionCount).to.equal(1n);

      const session = await evCharging.sessions(1);
      expect(session.user).to.equal(user1.address);
      expect(session.stationId).to.equal(stationId);
      expect(session.startTime).to.equal(startTime);
      expect(session.duration).to.equal(duration);
      expect(session.status).to.equal(0); // Booked status
    });

    it("should reject booking if it overlaps with an existing booking", async function () {
      const startTime1 = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const duration1 = 3600; // 1 hour

      // First booking: user 1 books from startTime1 to startTime1 + 3600
      await evCharging.connect(user1).bookSlot(stationId, startTime1, duration1);

      // Overlapping booking: user 2 tries to book during user 1's session (30 mins overlap)
      const startTime2 = startTime1 + 1800; // 30 mins after booking 1 starts
      const duration2 = 3600;

      await expect(
        evCharging.connect(user2).bookSlot(stationId, startTime2, duration2)
      ).to.be.revertedWith("Time slot already booked");
    });
  });

  describe("Dynamic Pricing Logic", function () {
    let stationId;

    beforeEach(async function () {
      const tx = await evCharging.connect(stationOwner).registerStation(
        "VIT Campus Charger 1",
        "12.9716,79.1594",
        basePricePerWh
      );
      await tx.wait();
      stationId = 1n;
    });

    it("should calculate correct price during non-peak hours with no demand markup", async function () {
      const nonPeakTime = 1722304800; // Let's use a timestamp where hour is not peak
      // e.g. timestamp 1722304800 corresponds to 1722304800 / 3600 = 478418 hours
      // 478418 % 24 = 2 (2 AM UTC, which is not 8-11 or 17-21)
      const rate = await evCharging.calculateRatePerWh(stationId, nonPeakTime);
      expect(rate).to.equal(basePricePerWh);
    });

    it("should apply peak surcharges correctly", async function () {
      // Peak 1: 8 AM to 11 AM (hour 9)
      const peakTime1 = 9 * 3600; // 32400 (corresponds to hour 9)
      let rate = await evCharging.calculateRatePerWh(stationId, peakTime1);
      // 20% surcharge expected
      expect(rate).to.equal(basePricePerWh + (basePricePerWh * 20n) / 100n);

      // Peak 2: 5 PM to 9 PM (hour 18)
      const peakTime2 = 18 * 3600; // 64800 (corresponds to hour 18)
      rate = await evCharging.calculateRatePerWh(stationId, peakTime2);
      // 30% surcharge expected
      expect(rate).to.equal(basePricePerWh + (basePricePerWh * 30n) / 100n);
    });

    it("should apply demand markups and renewable discounts correctly", async function () {
      // Set demand level to 50% and renewable ratio to 40%
      await evCharging.connect(stationOwner).updateStationPricing(stationId, 50, 40);

      const nonPeakTime = 2 * 3600; // 2 AM (no peak surcharge)
      const rate = await evCharging.calculateRatePerWh(stationId, nonPeakTime);

      // Formula: base + demandPremium - renewableDiscount
      // basePricePerWh = 1,000,000,000
      // demandPremium = 1,000,000,000 * 50 / 100 = 500,000,000
      // renewableDiscount = 1,000,000,000 * 40 / 200 = 200,000,000
      // Expected rate = 1,000,000,000 + 500,000,000 - 200,000,000 = 1,300,000,000
      expect(rate).to.equal(1300000000n);
    });

    it("should handle extremely high renewable discount and prevent pricing underflow (minimum price of 1 Wei)", async function () {
      // Register a very low base price station: 10 Wei
      const tempTx = await evCharging.connect(stationOwner).registerStation(
        "Low Price Charger",
        "12.9,79.1",
        10n
      );
      await tempTx.wait();
      const lowPriceStationId = 2n;

      // Set renewable to 100% (discount = 10 * 100 / 200 = 5 Wei)
      // Net rate = 10 - 5 = 5 Wei
      await evCharging.connect(stationOwner).updateStationPricing(lowPriceStationId, 0, 100);
      const rate = await evCharging.calculateRatePerWh(lowPriceStationId, 2 * 3600);
      expect(rate).to.equal(5n);
    });

    it("should revert if updating pricing with demand markup exceeding 200%", async function () {
      await expect(
        evCharging.connect(stationOwner).updateStationPricing(stationId, 201, 50)
      ).to.be.revertedWith("Demand markup factor too high");
    });

    it("should calculate edge of peak hours pricing correctly (e.g. 7:59 AM vs 8:00 AM)", async function () {
      // 7:59:59 AM is (7 * 3600) + (59 * 60) + 59 = 28799
      const nonPeakTime = 28799; 
      const rate1 = await evCharging.calculateRatePerWh(stationId, nonPeakTime);
      expect(rate1).to.equal(basePricePerWh);

      // 8:00:00 AM is 8 * 3600 = 28800
      const peakTime = 28800;
      const rate2 = await evCharging.calculateRatePerWh(stationId, peakTime);
      expect(rate2).to.equal(basePricePerWh + (basePricePerWh * 20n) / 100n);
    });
  });

  describe("Charging Lifecycle and Billing Flow", function () {
    let stationId;
    let sessionId;
    let startTime;
    const duration = 3600;

    beforeEach(async function () {
      const tx = await evCharging.connect(stationOwner).registerStation(
        "VIT Campus Charger 1",
        "12.9716,79.1594",
        basePricePerWh
      );
      await tx.wait();
      stationId = 1n;

      startTime = Math.floor(Date.now() / 1000) + 100; // Close to now
      const bookTx = await evCharging.connect(user1).bookSlot(stationId, startTime, duration);
      const receipt = await bookTx.wait();
      sessionId = 1n;
    });

    it("should run full workflow: start -> end (calculate bill) -> pay", async function () {
      // 1. Start charging
      await evCharging.connect(user1).startCharging(sessionId);
      let session = await evCharging.sessions(sessionId);
      expect(session.status).to.equal(1); // Charging

      // 2. End charging with 50 kWh (50000 Wh) consumed
      const energyConsumedWh = 50000n;
      
      // Calculate expected rate
      const rate = await evCharging.calculateRatePerWh(stationId, startTime);
      const expectedBill = energyConsumedWh * rate;

      await evCharging.connect(stationOwner).endCharging(sessionId, energyConsumedWh);
      
      session = await evCharging.sessions(sessionId);
      expect(session.status).to.equal(2); // Completed
      expect(session.energyConsumedWh).to.equal(energyConsumedWh);
      expect(session.totalBill).to.equal(expectedBill);

      // 3. Pay the bill
      const initialOwnerBalance = await ethers.provider.getBalance(stationOwner.address);
      
      const payTx = await evCharging.connect(user1).payBill(sessionId, {
        value: expectedBill
      });
      await payTx.wait();

      session = await evCharging.sessions(sessionId);
      expect(session.status).to.equal(3); // Paid

      const finalOwnerBalance = await ethers.provider.getBalance(stationOwner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(expectedBill);
    });
  });
});
