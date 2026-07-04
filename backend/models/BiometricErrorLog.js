const mongoose = require('mongoose');

const biometricErrorLogSchema = new mongoose.Schema({
  deviceUserId: { type: String, default: null },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  errorType: {
    type: String,
    enum: ['fingerprint_mismatch', 'device_communication', 'timeout', 'user_not_found', 'duplicate_fingerprint', 'device_offline', 'unknown'],
    default: 'unknown'
  },
  errorMessage: { type: String, required: true },
  rawData: { type: mongoose.Schema.Types.Mixed, default: null },
  deviceIp: { type: String, default: null },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: null }
}, { timestamps: true });

biometricErrorLogSchema.index({ createdAt: -1 });
biometricErrorLogSchema.index({ deviceUserId: 1 });
biometricErrorLogSchema.index({ errorType: 1 });
biometricErrorLogSchema.index({ resolved: 1 });
biometricErrorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

const BiometricErrorLog = mongoose.model('BiometricErrorLog', biometricErrorLogSchema);

module.exports = BiometricErrorLog;
