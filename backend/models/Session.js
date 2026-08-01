const mongoose = require("mongoose");

const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  current: { type: Number, required: true }, // in Amps
  voltage: { type: Number, required: true }, // in Volts
  power: { type: Number, required: true },   // in Watts
  energyConsumedWh: { type: Number, required: true } // cumulative Wh
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: Number, required: true, unique: true },
  userAddress: { type: String, required: true },
  stationId: { type: Number, required: true },
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
  startTimestamp: { type: Date },
  endTimestamp: { type: Date },
  energyConsumedWh: { type: Number, default: 0 },
  totalBill: { type: String, default: "0" }, // stored as string to handle uint256 size safely
  status: {
    type: String,
    enum: ["Booked", "Charging", "Completed", "Paid", "Cancelled"],
    default: "Booked"
  },
  telemetry: [TelemetrySchema],
  fraudFlag: { type: Boolean, default: false },
  fraudReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Session", SessionSchema);
