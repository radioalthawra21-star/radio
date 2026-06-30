/**
 * Well-Being Check-In Model
 * Daily employee well-being tracking (anonymous)
 */

var mongoose = require('mongoose');

var MoodLevel = {
  VERY_STRESSED: 1,
  STRESSED: 2,
  NEUTRAL: 3,
  GOOD: 4,
  EXCELLENT: 5
};

var WorkloadLevel = {
  TOO_HEAVY: 'too_heavy',
  NORMAL: 'normal',
  LIGHT: 'light'
};

var EnergyLevel = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high'
};

var SupportNeed = {
  YES: 'yes',
  MAYBE: 'maybe',
  NO: 'no'
};

var wellBeingCheckInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  periodKey: {
    type: String,
    required: true
  },
  mood: {
    type: Number,
    enum: Object.values(MoodLevel),
    required: true
  },
  workload: {
    type: String,
    enum: Object.values(WorkloadLevel),
    required: true
  },
  energy: {
    type: String,
    enum: Object.values(EnergyLevel),
    required: true
  },
  supportNeeded: {
    type: String,
    enum: Object.values(SupportNeed),
    required: true
  },
  comment: {
    type: String,
    default: null,
    maxlength: 500
  },
  ipHash: {
    type: String,
    default: null
  }
}, { timestamps: true });

wellBeingCheckInSchema.index({ userId: 1, periodKey: 1 }, { unique: true });
wellBeingCheckInSchema.index({ date: -1 });
wellBeingCheckInSchema.index({ periodKey: 1 });

wellBeingCheckInSchema.statics.hasSubmittedToday = async function(userId) {
  var today = new Date();
  var periodKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var existing = await this.findOne({ userId: userId, periodKey: periodKey });
  return !!existing;
};

wellBeingCheckInSchema.statics.getAggregatedStats = async function(periodKey, departmentId, minResponses) {
  if (minResponses === undefined) minResponses = 5;
  var query = { periodKey: periodKey };

  const [count, agg] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        avgMood: { $avg: '$mood' },
        moodValues: { $push: '$mood' },
        workloadTooHeavy: { $sum: { $cond: [{ $eq: ['$workload', 'too_heavy'] }, 1, 0] } },
        workloadNormal: { $sum: { $cond: [{ $eq: ['$workload', 'normal'] }, 1, 0] } },
        workloadLight: { $sum: { $cond: [{ $eq: ['$workload', 'light'] }, 1, 0] } },
        energyVeryLow: { $sum: { $cond: [{ $eq: ['$energy', 'very_low'] }, 1, 0] } },
        energyLow: { $sum: { $cond: [{ $eq: ['$energy', 'low'] }, 1, 0] } },
        energyNormal: { $sum: { $cond: [{ $eq: ['$energy', 'normal'] }, 1, 0] } },
        energyHigh: { $sum: { $cond: [{ $eq: ['$energy', 'high'] }, 1, 0] } },
        supportYes: { $sum: { $cond: [{ $eq: ['$supportNeeded', 'yes'] }, 1, 0] } },
        supportMaybe: { $sum: { $cond: [{ $eq: ['$supportNeeded', 'maybe'] }, 1, 0] } },
        supportNo: { $sum: { $cond: [{ $eq: ['$supportNeeded', 'no'] }, 1, 0] } },
        comments: { $push: { $cond: [{ $ifNull: ['$comment', false] }, '$comment', '$$REMOVE'] } }
      } }
    ])
  ]);

  if (count < minResponses) return null;
  if (!agg || agg.length === 0) return null;
  var r = agg[0];

  var moodDist = { veryStressed: 0, stressed: 0, neutral: 0, good: 0, excellent: 0 };
  if (r.moodValues) {
    for (var m = 0; m < r.moodValues.length; m++) {
      var v = r.moodValues[m];
      if (v === 1) moodDist.veryStressed++;
      else if (v === 2) moodDist.stressed++;
      else if (v === 3) moodDist.neutral++;
      else if (v === 4) moodDist.good++;
      else if (v === 5) moodDist.excellent++;
    }
  }

  return {
    responseCount: count,
    avgMood: Math.round((r.avgMood || 0) * 100) / 100,
    moodDistribution: moodDist,
    workloadDistribution: {
      tooHeavy: r.workloadTooHeavy || 0,
      normal: r.workloadNormal || 0,
      light: r.workloadLight || 0
    },
    energyDistribution: {
      very_low: r.energyVeryLow || 0,
      low: r.energyLow || 0,
      normal: r.energyNormal || 0,
      high: r.energyHigh || 0
    },
    supportDistribution: {
      yes: r.supportYes || 0,
      maybe: r.supportMaybe || 0,
      no: r.supportNo || 0
    },
    comments: (r.comments || []).filter(Boolean).slice(0, 20),
    supportPercentage: count > 0 ? Math.round(((r.supportYes || 0) / count) * 100) : 0
  };
};

wellBeingCheckInSchema.statics.getTrendData = async function(days, departmentId) {
  if (days === undefined) days = 7;
  var results = [];
  var now = new Date();

  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var periodKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    
    var stats = await this.getAggregatedStats(periodKey, departmentId, 0);
    results.push({
      date: periodKey,
      avgMood: stats ? stats.avgMood : null,
      responseCount: stats ? stats.responseCount : 0
    });
  }

  return results;
};

wellBeingCheckInSchema.statics.detectBurnoutRisk = async function(departmentId) {
  var last7Days = await this.getTrendData(7, departmentId);
  var validDays = [];
  for (var j = 0; j < last7Days.length; j++) {
    if (last7Days[j].avgMood !== null) {
      validDays.push(last7Days[j]);
    }
  }

  if (validDays.length < 5) return { risk: false, level: 'unknown' };

  var sumMood = 0;
  for (var k = 0; k < validDays.length; k++) sumMood += validDays[k].avgMood;
  var avgMood = sumMood / validDays.length;
  var decliningDays = [];
  
  for (var i = 1; i < validDays.length; i++) {
    if (validDays[i].avgMood < validDays[i - 1].avgMood) {
      decliningDays.push(i);
    }
  }

  var riskLevel = 'low';
  if (avgMood < 2.5) riskLevel = 'high';
  else if (avgMood < 3.0 || decliningDays.length >= 3) riskLevel = 'medium';

  return {
    risk: riskLevel !== 'low',
    level: riskLevel,
    avgMoodLast7Days: Math.round(avgMood * 100) / 100,
    decliningTrendDays: decliningDays.length,
    dailyData: validDays
  };
};

var WellBeingCheckIn = mongoose.model('WellBeingCheckIn', wellBeingCheckInSchema);

module.exports = { 
  WellBeingCheckIn: WellBeingCheckIn, 
  MoodLevel: MoodLevel, 
  WorkloadLevel: WorkloadLevel, 
  EnergyLevel: EnergyLevel, 
  SupportNeed: SupportNeed 
};