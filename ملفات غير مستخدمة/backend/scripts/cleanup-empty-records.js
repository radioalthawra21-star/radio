/**
 * Cleanup empty/orphaned attendance records
 * Removes records created by the old broken bridge that had empty deviceUserId
 * 
 * Usage: node scripts/cleanup-empty-records.js [--dry-run] [--count]
 *   --dry-run  Show what would be deleted without deleting
 *   --count    Just count empty records
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const countOnly = args.includes('--count');

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  const { Attendance } = require('../models/Attendance');

  // Records where deviceUserId is empty/blank AND no employee is linked
  const query = {
    $and: [
      { employee: { $exists: false } },
      { $or: [
        { deviceUserId: { $in: ['', null, undefined] } },
        { deviceUserId: { $exists: false } }
      ]}
    ]
  };

  const total = await Attendance.countDocuments(query);
  console.log(`Empty/orphaned records: ${total}`);

  if (countOnly) {
    await mongoose.disconnect();
    process.exit(0);
  }

  if (total === 0) {
    console.log('No empty records to clean up.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (dryRun) {
    console.log('');
    console.log('─── SAMPLE RECORDS TO DELETE ───');
    const samples = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    samples.forEach(r => {
      console.log(`  ${r._id} | date=${r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A'} | createdAt=${r.createdAt ? new Date(r.createdAt).toISOString() : 'N/A'}`);
    });
    console.log('');
    console.log(`Total to delete: ${total}`);
    console.log('Run without --dry-run to actually delete');
  } else {
    const result = await Attendance.deleteMany(query);
    console.log(`Deleted ${result.deletedCount} empty/orphaned records`);
  }

  await mongoose.disconnect();
})();
