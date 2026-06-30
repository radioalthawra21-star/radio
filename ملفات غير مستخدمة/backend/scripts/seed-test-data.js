/**
 * Seed Script: Test Data for Payroll & Leave System
 *
 * Creates:
 *  - 2 employees, 1 manager, 1 admin
 *  - Leave requests (annual, unpaid, hourly, mission, overtime)
 *  - Payroll with PayrollItems
 *  - Attendance records
 *
 * Run: node scripts/seed-test-data.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { User } = require('../models/User');
const { LeaveRequest } = require('../models/LeaveRequest');
const { Payroll } = require('../models/Payroll');
const { PayrollItem } = require('../models/PayrollItem');
const { Attendance } = require('../models/Attendance');
const { Notification } = require('../models/Notification');

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
  await mongoose.connect(MONGO_URI);
  console.log('📦 Connected to MongoDB');

  // ── Clean existing test data ──
  const cleanCollections = async () => {
    await Promise.all([
      User.deleteMany({ email: /test-/ }),
      LeaveRequest.deleteMany({}),
      Payroll.deleteMany({}),
      PayrollItem.deleteMany({}),
      Attendance.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('🧹 Cleaned test data');
  };
  await cleanCollections();

  // ── Create Users ──
  const admin = await User.create({
    username: 'test-admin', email: 'test-admin@hrms.com',
    name: 'المدير العام (اختبار)', role: 'admin',
    password: '$2a$10$dummy', isActive: true,
  });

  const manager = await User.create({
    username: 'test-mgr', email: 'test-mgr@hrms.com',
    name: 'مدير الموارد البشرية (اختبار)', role: 'manager',
    department: 'الموارد البشرية',
    password: '$2a$10$dummy', isActive: true,
  });

  const emp1 = await User.create({
    username: 'test-emp1', email: 'test-emp1@hrms.com',
    name: 'أحمد محمد (اختبار)', role: 'employee',
    department: 'الموارد البشرية', baseSalary: 15000,
    password: '$2a$10$dummy', isActive: true,
  });

  const emp2 = await User.create({
    username: 'test-emp2', email: 'test-emp2@hrms.com',
    name: 'سارة خالد (اختبار)', role: 'employee',
    department: 'الموارد البشرية', baseSalary: 22000,
    password: '$2a$10$dummy', isActive: true,
  });

  console.log('👥 Created users:', admin.name, manager.name, emp1.name, emp2.name);

  // ── Create Leave Requests ──
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const leaves = await LeaveRequest.insertMany([
    {
      employee: emp1._id, type: 'annual',
      startDate: new Date(thisYear, thisMonth, 10),
      endDate: new Date(thisYear, thisMonth, 12),
      days: 3, reason: 'إجازة سنوية', status: 'approved',
      approvedBy: manager._id, approvedAt: new Date(),
      department: 'الموارد البشرية',
    },
    {
      employee: emp1._id, type: 'mission',
      startDate: new Date(thisYear, thisMonth, 15),
      endDate: new Date(thisYear, thisMonth, 15),
      days: 1, reason: 'مهمة خارجية', status: 'synced_to_payroll',
      missionType: 'external', visitParty: 'شركة التقنية',
      transportAllowance: 250, estimatedAmount: 250,
      approvedBy: manager._id, approvedAt: new Date(),
      department: 'الموارد البشرية',
    },
    {
      employee: emp2._id, type: 'unpaid',
      startDate: new Date(thisYear, thisMonth, 5),
      endDate: new Date(thisYear, thisMonth, 5),
      days: 1, reason: 'ظرف عائلي', status: 'pending_manager',
      department: 'الموارد البشرية',
    },
    {
      employee: emp2._id, type: 'hourly',
      startTime: '09:00', endTime: '13:00',
      hours: 4, reason: 'موعد شخصي', status: 'approved',
      approvedBy: manager._id, approvedAt: new Date(),
      department: 'الموارد البشرية',
    },
    {
      employee: emp1._id, type: 'overtime',
      startDate: new Date(thisYear, thisMonth, 8),
      overtimeHours: 3, reason: 'مشروع عاجل', status: 'synced_to_payroll',
      estimatedAmount: 450, compensationResult: { amount: 450, currency: 'SAR', payrollCode: 'OVERTIME_PAYMENT' },
      approvedBy: manager._id, approvedAt: new Date(),
      department: 'الموارد البشرية',
    },
  ]);
  console.log('📋 Created', leaves.length, 'leave requests');

  // ── Create Payroll Items ──
  const payrollItems = await PayrollItem.insertMany([
    {
      employee: emp1._id, type: 'mission', direction: 'addition',
      amount: 250, currency: 'SAR', payrollCode: 'MISSION_EXTERNAL_ALLOWANCE',
      sourceType: 'mission', sourceModel: 'LeaveRequest', sourceId: leaves[1]._id,
      effectiveDate: new Date(), idempotencyKey: 'SEED-MS-' + leaves[1]._id,
      status: 'active', description: 'بدل مهمة خارجية',
      metadata: { missionType: 'external', amount: 250 },
    },
    {
      employee: emp1._id, type: 'overtime', direction: 'addition',
      amount: 450, currency: 'SAR', payrollCode: 'OVERTIME_PAYMENT',
      sourceType: 'overtime', sourceModel: 'LeaveRequest', sourceId: leaves[4]._id,
      effectiveDate: new Date(), idempotencyKey: 'SEED-OT-' + leaves[4]._id,
      status: 'active', description: 'أجر إضافي 3 ساعات',
      metadata: { hours: 3, rate: 100, multiplier: 1.5 },
    },
    {
      employee: emp1._id, type: 'leave', direction: 'deduction',
      amount: 681.82, currency: 'SAR', payrollCode: 'LEAVE_UNPAID_DEDUCTION',
      sourceType: 'unpaid', sourceModel: 'LeaveRequest', sourceId: new mongoose.Types.ObjectId(),
      effectiveDate: new Date(), idempotencyKey: 'SEED-UD-SAMPLE',
      status: 'active', description: 'خصم إجازة بدون راتب',
      metadata: { days: 1, dailyRate: 681.82 },
    },
  ]);
  console.log('💰 Created', payrollItems.length, 'payroll items');

  // ── Create Payroll ──
  const periodStart = new Date(thisYear, thisMonth, 1);
  const periodEnd = new Date(thisYear, thisMonth + 1, 0);

  const payroll = await Payroll.create({
    employee: emp1._id,
    periodStart, periodEnd,
    paymentDate: new Date(thisYear, thisMonth + 1, 1),
    frequency: 'monthly', baseSalary: 15000,
    workingDays: 22, daysWorked: 20,
    components: {
      allowances: [{ type: 'transport', amount: 500, description: 'بدل مواصلات' }],
      bonuses: [{ type: 'performance', amount: 1000, reason: 'أداء متميز' }],
      overtime: { hours: 3, hourlyRate: 100, totalAmount: 450 },
    },
    deductions: {
      absences: { days: 2, dailyRate: 681.82, totalAmount: 1363.64 },
      latePenalties: { occurrences: 1, amountPerOccurrence: 50, totalAmount: 50 },
    },
    status: 'pending', generatedBy: admin._id,
    notes: 'راتب اختباري - تم إنشاؤه يدوياً',
  });
  console.log('📄 Created payroll for', emp1.name, '(ID:', payroll._id, ')');

  // ── Create Attendance ──
  const attRecords = [];
  for (let day = 1; day <= 5; day++) {
    const date = new Date(thisYear, thisMonth, day);
    if (date.getDay() !== 5 && date.getDay() !== 6) {
      attRecords.push({
        employee: emp1._id, date,
        status: day === 3 ? 'late' : 'present',
        checkIn: day === 3 ? '09:30' : '08:50',
        checkOut: '17:00', expectedHours: 8, duration: day === 3 ? 7.5 : 8,
        department: 'الموارد البشرية',
      });
    }
  }
  await Attendance.insertMany(attRecords);
  console.log('📅 Created', attRecords.length, 'attendance records');

  // ── Summary ──
  console.log('\n═══════════════════════════════════');
  console.log('✅ Seed completed successfully!');
  console.log(`  Admin ID: ${admin._id}`);
  console.log(`  Manager ID: ${manager._id}`);
  console.log(`  Employee 1 (أحمد): ${emp1._id}`);
  console.log(`  Employee 2 (سارة): ${emp2._id}`);
  console.log(`  Payroll ID: ${payroll._id}`);
  console.log(`  Leave requests: ${leaves.length}`);
  console.log(`  Payroll items: ${payrollItems.length}`);
  console.log('═══════════════════════════════════\n');
  console.log('Login credentials: (password hashed, use "test123" if auth system supports it)');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
