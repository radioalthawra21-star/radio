const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  deviceUserId: { type: String, default: null },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timestamp: { type: Date, required: true },
  eventType: {
    type: String,
    enum: ['checkin', 'checkout', 'unknown'],
    default: 'unknown'
  },
  deviceUserName: { type: String, default: null },
  deviceName: { type: String, default: null }
}, { timestamps: true });

deviceLogSchema.index({ timestamp: -1 });
deviceLogSchema.index({ employee: 1, timestamp: -1 });
deviceLogSchema.index({ deviceUserId: 1, timestamp: -1 });

const DeviceLog = mongoose.model('DeviceLog', deviceLogSchema);

module.exports = DeviceLog;
