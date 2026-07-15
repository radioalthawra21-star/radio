const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  target: { type: String, default: '' },
  status: {
    type: String,
    enum: ['completed', 'in_progress', 'not_completed', 'stopped', 'postponed'],
    default: 'in_progress'
  },
  completionPercentage: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: true });

const dailyReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  employeeName: { type: String, default: '' },
  department: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  directManager: { type: String, default: '' },
  reportDate: { type: String, default: '' },

  achievements: [achievementSchema],

  priorities: {
    first: { type: String, default: '' },
    second: { type: String, default: '' },
    third: { type: String, default: '' }
  },

  challenges: {
    obstacles: { type: String, default: '' },
    supportRequired: { type: String, default: '' }
  },

  suggestions: {
    performanceVision: { type: String, default: '' }
  },

  bestWork: {
    items: [{
      title: { type: String, default: '' },
      publishLink: { type: String, default: '' }
    }]
  },

  isOnVacation: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'submitted'], default: 'submitted' }
}, { timestamps: true });

dailyReportSchema.index({ userId: 1, date: -1 }, { unique: true });

dailyReportSchema.statics.hasSubmittedToday = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const existing = await this.findOne({
    userId,
    date: { $gte: today, $lt: tomorrow }
  });
  return !!existing;
};

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

module.exports = DailyReport;
