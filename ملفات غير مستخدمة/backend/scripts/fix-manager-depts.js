const mongoose = require('mongoose');
const { User } = require('../models/User');
const Department = require('../models/Department');

const DEPT_MAP = {
  'marketing': 'التسويق',
  'production': 'الإنتاج',
  'financial': 'المالي',
  'المالية': 'المالي',
  'الIT': 'تقنية المعلومات',
};

async function run() {
  await mongoose.connect('mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/test');
  for (const [oldDept, newDept] of Object.entries(DEPT_MAP)) {
    const deptDoc = await Department.findOne({ name: newDept }).lean();
    if (!deptDoc) { console.log('WARN: Department not found:', newDept); continue; }
    const result = await User.updateMany(
      { department: oldDept },
      { $set: { department: deptDoc.name } }
    );
    if (result.modifiedCount > 0) {
      console.log('Updated ' + result.modifiedCount + ' users from ' + oldDept + ' -> ' + deptDoc.name);
    }
  }
  const mgrs = await User.find({ role: 'manager' }, 'name department').lean();
  console.log('\n=== Managers after fix ===');
  for (const m of mgrs) {
    const doc = await Department.findOne({ name: m.department }).catch(() => null);
    console.log(m.name.padEnd(20) + ' | ' + m.department.padEnd(20) + ' | ' + (doc ? 'OK' : 'NOT IN DEPT COLLECTION'));
  }
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
