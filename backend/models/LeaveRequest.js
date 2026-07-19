/**
 * Leave Request Model
 * Employee leave management system
 * Extended: hourly (sاعية), mission (مهمة), overtime (أجر إضافي), attendance correction (تصحيح بصمة)
 */

const mongoose = require('mongoose');

const LeaveType = {
  ANNUAL: 'annual',
  SICK: 'sick',
  EXCEPTIONAL: 'exceptional',
  DEATH: 'death',
  UNPAID: 'unpaid',
  MATERNITY: 'maternity',
  COMPENSATORY: 'compensatory',
  HOURLY: 'hourly',
  MISSION: 'mission',
  OVERTIME: 'overtime',
  ATTENDANCE_CORRECTION: 'attendance_correction',
  FINGERPRINT_FORGOTTEN: 'fingerprint_forgotten',
  HAJJ: 'hajj',
  DEVELOPMENT: 'development',
};

const LeaveStatus = {
  DRAFT: 'draft',
  PENDING_OFFICE_MANAGER: 'pending_office_manager',
  PENDING_MANAGER: 'pending_manager',
  PENDING_GENERAL_MANAGER: 'pending_general_manager',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  SYNCED_TO_PAYROLL: 'synced_to_payroll',
};

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: Object.values(LeaveType), required: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  days: { type: Number, default: 0 },
  hours: { type: Number, default: 0 },
  isHalfDay: { type: Boolean, default: false },
  reason: { type: String, required: true },
  documents: [{ url: String, description: String }],
  status: { type: String, enum: Object.values(LeaveStatus), default: LeaveStatus.DRAFT },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  department: { type: String, default: null },
  managerNotes: { type: String, default: null },
  coveragePlan: { type: String, default: null },
  managerSuggestedDays: { type: Number, default: null },
  idempotencyKey: { type: String, unique: true, sparse: true, default: null },

  // Mission-specific fields
  missionType: { type: String, enum: ['internal', 'external', null], default: null },
  visitParty: { type: String, default: null },
  geoLocation: {
    lat: Number,
    lng: Number,
    address: String,
  },
  transportAllowance: { type: Number, default: null },

  // Overtime-specific
  overtimeHours: { type: Number, default: null },
  overtimeHourlyRate: { type: Number, default: null },
  overtimeMultiplier: { type: Number, default: null },
  estimatedAmount: { type: Number, default: null },

  // Death leave degree (1=first degree: 3 days, 2=second degree: 2 days, 3=third degree: 1 day)
  deathDegree: { type: Number, enum: [1, 2, 3, null], default: null },

  // Medical report for sick leave
  medicalReport: { type: String, default: null },

  // Fingerprint-forgotten specific fields
  fingerprintType: { type: String, enum: ['in', 'out', null], default: null },
  fingerprintDate: { type: Date, default: null },
  fingerprintTime: { type: String, default: null },

  // Payroll sync
  payrollItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollItem', default: null },
  compensationResult: { type: mongoose.Schema.Types.Mixed, default: null },

  // Leave stop-by-fingerprint feature
  stopRequested: { type: Boolean, default: false },
  stopRequestedAt: { type: Date, default: null },
  checkInDetectedAt: { type: Date, default: null },
  fingerprintStoppedAt: { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ employee: 1, startDate: -1 });
leaveRequestSchema.index({ department: 1, status: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });
leaveRequestSchema.index({ type: 1, employee: 1, startDate: -1 });
leaveRequestSchema.index({ stopRequested: 1 });
// idempotencyKey has unique:true in field definition; no duplicate index needed

leaveRequestSchema.virtual('isActive').get(function () {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(this.startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(this.endDate); end.setHours(23, 59, 59, 999);
  return this.status === LeaveStatus.APPROVED && today >= start && today <= end;
});

leaveRequestSchema.methods.calculateDays = function () {
  if (!this.startDate || !this.endDate) return 0;
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end - start);
  let totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (this.isHalfDay) totalDays -= 0.5;
  this.days = Math.max(0, totalDays);
  return this.days;
};

leaveRequestSchema.methods.calculateHours = function () {
  if (this.startTime && this.endTime) {
    const [sh, sm] = this.startTime.split(':').map(Number);
    const [eh, em] = this.endTime.split(':').map(Number);
    this.hours = Math.max(0, (eh + em / 60) - (sh + sm / 60));
  }
  return this.hours;
};

leaveRequestSchema.statics.checkLeaveBalance = async function (employeeId, leaveType, options = {}) {
  const currentYear = new Date().getFullYear();

  const effectiveType = leaveType === 'hourly' ? 'annual' : leaveType;

  // Read balances from Settings, fall back to hardcoded defaults
  let settings = {};
  try {
    const Settings = mongoose.model('Settings');
    const allSettings = await Settings.find();
    allSettings.forEach(s => { settings[s.key] = s.value; });
  } catch (e) { /* ignore */ }

  const defaultBalances = {
    annual: settings.leaveAnnualDays || 30,
    sick: Infinity,
    exceptional: Infinity,
    death: Infinity,
    maternity: settings.leaveMaternityDays || 90,
    compensatory: 0,
    unpaid: Infinity,
    hourly: settings.leaveAnnualDays || 30,
    mission: Infinity,
    overtime: Infinity,
    attendance_correction: Infinity,
    fingerprint_forgotten: Infinity,
    hajj: settings.leaveHajjDays || 30,
    development: settings.leaveDevelopmentHoursPerWeek || 6,
  };

  // Development leave: check current ISO week usage, not yearly
  if (leaveType === 'development') {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);

    const weekLeaves = await this.find({
      employee: employeeId,
      type: 'development',
      status: { '$in': [LeaveStatus.APPROVED, LeaveStatus.SYNCED_TO_PAYROLL, LeaveStatus.PENDING_OFFICE_MANAGER, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_GENERAL_MANAGER] },
      startDate: { '$gte': monday, '$lte': sunday },
    });

    const weekUsedHours = weekLeaves.reduce((sum, l) => sum + (l.hours || 0), 0);
    const maxWeeklyHours = defaultBalances.development;
    const remainingWeeklyHours = Math.max(0, maxWeeklyHours - weekUsedHours);
    return {
      totalBalance: maxWeeklyHours, usedDays: 0, usedHours: Math.round(weekUsedHours * 10) / 10,
      remainingBalance: 0, remainingHours: Math.round(remainingWeeklyHours * 10) / 10,
      hasSufficientBalance: remainingWeeklyHours > 0,
      maxWeeklyHours, weekUsedHours: Math.round(weekUsedHours * 10) / 10,
    };
  }

  // For annual/hourly: separate days (annual only) from hours (hourly only)
  // 7 hourly leave hours = 1 day deduction
  if (effectiveType === 'annual') {
    const approvedLeaves = await this.find({
      employee: employeeId,
      type: { $in: ['annual', 'hourly'] },
      status: { '$in': [LeaveStatus.APPROVED, LeaveStatus.SYNCED_TO_PAYROLL] },
      startDate: { '$gte': new Date(currentYear, 0, 1) },
    });
    // Annual leaves: count days only
    const annualLeaves = approvedLeaves.filter(l => l.type === 'annual');
    const usedDays = annualLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
    // Hourly leaves: count hours only
    const hourlyLeaves = approvedLeaves.filter(l => l.type === 'hourly');
    const usedHours = hourlyLeaves.reduce((sum, l) => {
      // If hours is set, use it
      if (l.hours > 0) return sum + l.hours;
      // Fallback: calculate from startTime/endTime
      if (l.startTime && l.endTime) {
        const [sh, sm] = l.startTime.split(':').map(Number);
        const [eh, em] = l.endTime.split(':').map(Number);
        return sum + Math.max(0, (eh + em / 60) - (sh + sm / 60));
      }
      // Last resort: old records with days=1 for hourly → assume 7 hours
      return sum + (l.days || 0) * 7;
    }, 0);
    // Convert everything to hours, then back to days
    const HOURS_PER_DAY = 7;
    const totalBalanceHours = (defaultBalances.annual || 0) * HOURS_PER_DAY;
    const usedHoursTotal = (usedDays * HOURS_PER_DAY) + usedHours;
    const remainingHoursTotal = Math.max(0, totalBalanceHours - usedHoursTotal);
    const remainingDays = Math.floor(remainingHoursTotal / HOURS_PER_DAY);
    const remainingHours = remainingHoursTotal % HOURS_PER_DAY;
    return {
      totalBalance: defaultBalances.annual || 0, usedDays, usedHours,
      remainingBalance: remainingDays, remainingHours,
      hasSufficientBalance: leaveType === 'hourly'
        ? remainingHoursTotal > 0
        : remainingDays > 0,
    };
  }

  // Other leave types
  const approvedLeaves = await this.find({
    employee: employeeId,
    type: effectiveType,
    status: { '$in': [LeaveStatus.APPROVED, LeaveStatus.SYNCED_TO_PAYROLL] },
    startDate: { '$gte': new Date(currentYear, 0, 1) },
  });
  const usedDays = approvedLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
  const usedHours = approvedLeaves.reduce((sum, l) => sum + (l.hours || 0), 0);
  const totalBalance = defaultBalances[effectiveType] || 0;
  const remainingBalance = totalBalance - usedDays;
  const remainingHours = (totalBalance * 8) - usedHours;
  const hasSufficientBalance = remainingBalance > 0;
  return { totalBalance, usedDays, usedHours, remainingBalance, remainingHours, hasSufficientBalance };
};

leaveRequestSchema.statics.getOverlappingLeaves = async function (employeeId, startDate, endDate, excludeId = null) {
  const query = {
    employee: employeeId,
    status: { '$in': [LeaveStatus.APPROVED, LeaveStatus.PENDING_OFFICE_MANAGER, LeaveStatus.PENDING_MANAGER, LeaveStatus.PENDING_GENERAL_MANAGER, LeaveStatus.SYNCED_TO_PAYROLL] },
    '$or': [{ startDate: { '$lte': endDate }, endDate: { '$gte': startDate } }],
  };
  if (excludeId) query._id = { '$ne': excludeId };
  return this.find(query);
};

leaveRequestSchema.statics.getDepartmentLeaveCalendar = async function (department, startDate, endDate) {
  return this.find({
    department,
    status: { '$in': [LeaveStatus.APPROVED, LeaveStatus.SYNCED_TO_PAYROLL] },
    '$or': [{ startDate: { '$lte': endDate }, endDate: { '$gte': startDate } }],
  }).populate('employee', 'name');
};

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
module.exports = { LeaveRequest, LeaveType, LeaveStatus };