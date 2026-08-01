const mongoose = require("mongoose");

const QueueItemSchema = new mongoose.Schema({
  userAddress: { type: String, required: true },
  sessionId: { type: Number, required: true },
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in seconds
});

const StationSchema = new mongoose.Schema({
  stationId: { type: Number, required: true, unique: true },
  owner: { type: String, required: true },
  name: { type: String, required: true },
  coordinates: { type: String, required: true }, // "lat,lng"
  basePricePerWh: { type: Number, required: true }, // in Wei
  demandLevel: { type: Number, default: 0 }, // 0-100 markup
  renewableRatio: { type: Number, default: 0 }, // 0-100 green ratio
  active: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ["available", "occupied", "offline"], 
    default: "available" 
  },
  queue: [QueueItemSchema],
  waitEstimateMinutes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Station", StationSchema);
