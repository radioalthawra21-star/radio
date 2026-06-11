const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['public_holiday', 'religious', 'national', 'other'],
    default: 'public_holiday'
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

holidaySchema.index({ startDate: 1, endDate: 1 });
holidaySchema.index({ year: 1, startDate: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;
