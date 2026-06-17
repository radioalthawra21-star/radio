const mongoose = require('mongoose');

const CHECKEXACT_ACTIONS = {
  ISADD: 'ISADD',
  ISDELETE: 'ISDELETE'
};

const checkExactSchema = new mongoose.Schema({
  deviceUserId: {
    type: String,
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  timestamp: {
    type: Date,
    required: true
  },
  action: {
    type: String,
    enum: Object.values(CHECKEXACT_ACTIONS),
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  date: {
    type: Date,
    required: true
  },
  source: {
    type: String,
    enum: ['manual', 'leave_approval', 'api', 'system'],
    default: 'manual'
  },
  isApplied: {
    type: Boolean,
    default: false
  },
  appliedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

checkExactSchema.index({ deviceUserId: 1, date: -1 });
checkExactSchema.index({ employee: 1, date: -1 });
checkExactSchema.index({ timestamp: -1 });
checkExactSchema.index({ action: 1 });

const CheckExact = mongoose.model('CheckExact', checkExactSchema);

module.exports = { CheckExact, CHECKEXACT_ACTIONS };
