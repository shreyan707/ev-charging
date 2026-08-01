// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EVCharging {
    address public owner;

    enum SessionStatus { Booked, Charging, Completed, Paid, Cancelled }

    struct Station {
        uint256 id;
        address payable owner;
        string name;
        string coordinates; // Latitude and Longitude string (e.g. "12.9716,79.1594")
        uint256 basePricePerWh; // in Wei per Watt-hour
        uint256 demandLevel; // 0 to 100 (percentage markup factor)
        uint256 renewableRatio; // 0 to 100 (percentage of green energy)
        bool active;
    }

    struct BookingSlot {
        uint256 startTime; // Unix timestamp
        uint256 endTime; // Unix timestamp
        uint256 sessionId;
        bool active;
    }

    struct Session {
        uint256 id;
        address user;
        uint256 stationId;
        uint256 startTime; // Booked start time
        uint256 duration; // Booked duration in seconds
        uint256 startTimestamp; // Actual charging start time
        uint256 endTimestamp; // Actual charging end time
        uint256 energyConsumedWh; // Measured energy from IoT sensor
        uint256 totalBill; // Calculated bill in Wei
        SessionStatus status;
    }

    uint256 public stationCount;
    uint256 public sessionCount;

    mapping(uint256 => Station) public stations;
    mapping(uint256 => Session) public sessions;
    
    // StationId => BookingSlot[] to track and check overlaps
    mapping(uint256 => BookingSlot[]) public stationBookings;
    
    // User Address => list of session IDs
    mapping(address => uint256[]) public userSessions;

    event StationRegistered(uint256 indexed stationId, address indexed owner, string name, string coordinates);
    event StationPricingUpdated(uint256 indexed stationId, uint256 demandLevel, uint256 renewableRatio);
    event SlotBooked(uint256 indexed sessionId, uint256 indexed stationId, address indexed user, uint256 startTime, uint256 duration);
    event ChargingStarted(uint256 indexed sessionId, uint256 startTimestamp);
    event ChargingEnded(uint256 indexed sessionId, uint256 endTimestamp, uint256 energyConsumedWh, uint256 totalBill);
    event BillPaid(uint256 indexed sessionId, address indexed user, uint256 amountPaid);
    event SessionCancelled(uint256 indexed sessionId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this");
        _;
    }

    modifier onlyStationOwner(uint256 _stationId) {
        require(stations[_stationId].owner == msg.sender, "Only the station owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Register a new charging station
    function registerStation(
        string memory _name,
        string memory _coordinates,
        uint256 _basePricePerWh
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Station name cannot be empty");
        require(bytes(_coordinates).length > 0, "Coordinates cannot be empty");
        require(_basePricePerWh > 0, "Base price must be greater than zero");

        stationCount++;
        stations[stationCount] = Station({
            id: stationCount,
            owner: payable(msg.sender),
            name: _name,
            coordinates: _coordinates,
            basePricePerWh: _basePricePerWh,
            demandLevel: 0,
            renewableRatio: 0,
            active: true
        });

        emit StationRegistered(stationCount, msg.sender, _name, _coordinates);
        return stationCount;
    }

    // Update dynamic pricing parameters for a station
    function updateStationPricing(
        uint256 _stationId,
        uint256 _demandLevel,
        uint256 _renewableRatio
    ) external onlyStationOwner(_stationId) {
        require(_demandLevel <= 200, "Demand markup factor too high");
        require(_renewableRatio <= 100, "Renewable ratio cannot exceed 100");
        
        Station storage station = stations[_stationId];
        station.demandLevel = _demandLevel;
        station.renewableRatio = _renewableRatio;

        emit StationPricingUpdated(_stationId, _demandLevel, _renewableRatio);
    }

    // Book a time slot for a station
    function bookSlot(
        uint256 _stationId,
        uint256 _startTime,
        uint256 _duration
    ) external returns (uint256) {
        require(stations[_stationId].active, "Station is not active");
        require(_startTime >= block.timestamp - 300, "Booking time cannot be in the past");
        require(_duration > 0, "Duration must be greater than zero");

        uint256 endTime = _startTime + _duration;

        // Check for double booking overlaps
        BookingSlot[] storage bookings = stationBookings[_stationId];
        for (uint256 i = 0; i < bookings.length; i++) {
            if (bookings[i].active) {
                // If new slot overlaps with existing slot:
                // (StartA < EndB) and (EndA > StartB)
                if (_startTime < bookings[i].endTime && endTime > bookings[i].startTime) {
                    revert("Time slot already booked");
                }
            }
        }

        sessionCount++;
        
        // Save the booking slot
        bookings.push(BookingSlot({
            startTime: _startTime,
            endTime: endTime,
            sessionId: sessionCount,
            active: true
        }));

        // Initialize session
        sessions[sessionCount] = Session({
            id: sessionCount,
            user: msg.sender,
            stationId: _stationId,
            startTime: _startTime,
            duration: _duration,
            startTimestamp: 0,
            endTimestamp: 0,
            energyConsumedWh: 0,
            totalBill: 0,
            status: SessionStatus.Booked
        });

        userSessions[msg.sender].push(sessionCount);

        emit SlotBooked(sessionCount, _stationId, msg.sender, _startTime, _duration);
        return sessionCount;
    }

    // Start charging session
    function startCharging(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender, "Only the booking user can start charging");
        require(session.status == SessionStatus.Booked, "Session is not in Booked state");
        require(block.timestamp >= session.startTime - 900, "Too early to start charging"); // 15 mins grace period
        
        session.status = SessionStatus.Charging;
        session.startTimestamp = block.timestamp;

        emit ChargingStarted(_sessionId, block.timestamp);
    }

    // End charging session (typically called by backend/IoT reporter or station owner)
    function endCharging(uint256 _sessionId, uint256 _energyConsumedWh) external {
        Session storage session = sessions[_sessionId];
        Station storage station = stations[session.stationId];
        
        // Allow station owner (which runs the IoT gateway/backend) to end the session
        require(
            msg.sender == station.owner || msg.sender == owner || msg.sender == session.user,
            "Not authorized to end charging"
        );
        require(session.status == SessionStatus.Charging, "Session is not in Charging state");

        session.status = SessionStatus.Completed;
        session.endTimestamp = block.timestamp;
        session.energyConsumedWh = _energyConsumedWh;
        
        // Calculate dynamic bill
        session.totalBill = calculateSessionBill(_sessionId);

        // Deactivate booking slot
        BookingSlot[] storage bookings = stationBookings[session.stationId];
        for (uint256 i = 0; i < bookings.length; i++) {
            if (bookings[i].sessionId == _sessionId) {
                bookings[i].active = false;
                break;
            }
        }

        emit ChargingEnded(_sessionId, block.timestamp, _energyConsumedWh, session.totalBill);
    }

    // Pay the bill for a completed session
    function payBill(uint256 _sessionId) external payable {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender, "Only the session user can pay the bill");
        require(session.status == SessionStatus.Completed, "Session is not completed or already paid");
        require(msg.value >= session.totalBill, "Insufficient funds sent to pay the bill");

        session.status = SessionStatus.Paid;
        
        // Transfer funds to station owner
        Station storage station = stations[session.stationId];
        station.owner.transfer(session.totalBill);

        // Return excess payment if any
        if (msg.value > session.totalBill) {
            payable(msg.sender).transfer(msg.value - session.totalBill);
        }

        emit BillPaid(_sessionId, msg.sender, session.totalBill);
    }

    // Cancel a booked session
    function cancelSession(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(session.user == msg.sender || msg.sender == owner, "Not authorized to cancel");
        require(session.status == SessionStatus.Booked, "Can only cancel booked sessions");

        session.status = SessionStatus.Cancelled;

        // Deactivate booking slot
        BookingSlot[] storage bookings = stationBookings[session.stationId];
        for (uint256 i = 0; i < bookings.length; i++) {
            if (bookings[i].sessionId == _sessionId) {
                bookings[i].active = false;
                break;
            }
        }

        emit SessionCancelled(_sessionId);
    }

    // Calculate billing rate per Wh based on:
    // formula: rate = base + peakSurcharge + demandPremium - renewableDiscount
    function calculateRatePerWh(uint256 _stationId, uint256 _timestamp) public view returns (uint256) {
        Station memory station = stations[_stationId];
        require(station.active, "Station is not active");

        uint256 base = station.basePricePerWh;
        
        // 1. Peak hour check (determined from timestamp)
        // Peak hours: 8am-11am (surcharge 20%) and 5pm-9pm (surcharge 30%)
        uint256 hour = (_timestamp / 3600) % 24;
        uint256 peakSurcharge = 0;
        if (hour >= 8 && hour < 11) {
            peakSurcharge = (base * 20) / 100; // 20% surcharge
        } else if (hour >= 17 && hour < 21) {
            peakSurcharge = (base * 30) / 100; // 30% surcharge
        }

        // 2. Demand Premium (based on demandLevel percentage)
        // e.g. demandLevel of 50 adds 50% of base price
        uint256 demandPremium = (base * station.demandLevel) / 100;

        // 3. Renewable Discount (based on renewableRatio percentage)
        // Max 50% discount if renewableRatio is 100%
        uint256 renewableDiscount = (base * station.renewableRatio) / 200;

        uint256 rate = base + peakSurcharge + demandPremium;
        if (rate > renewableDiscount) {
            return rate - renewableDiscount;
        } else {
            return 1; // Minimum price of 1 Wei to prevent free exploitation
        }
    }

    // Calculate total bill for a specific session based on its start time and energy consumed
    function calculateSessionBill(uint256 _sessionId) public view returns (uint256) {
        Session memory session = sessions[_sessionId];
        require(session.status == SessionStatus.Charging || session.status == SessionStatus.Completed || session.status == SessionStatus.Paid, "Invalid session status for billing");
        
        uint256 rate = calculateRatePerWh(session.stationId, session.startTime);
        return session.energyConsumedWh * rate;
    }

    // Helper functions for frontend/caching
    function getUserSessions(address _user) external view returns (uint256[] memory) {
        return userSessions[_user];
    }

    function getStationBookings(uint256 _stationId) external view returns (BookingSlot[] memory) {
        return stationBookings[_stationId];
    }
}
