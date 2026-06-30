const mongoose = require('mongoose');
const { User } = require('../models/User');
const Department = require('../models/Department');

async function resolveDepartment(deptValue) {
  const deptDoc = await Department.findById(deptValue).catch(() => null)
    || await Department.findOne({ name: deptValue }).catch(() => null);
  const values = [deptValue];
  if (deptDoc) {
    values.push(deptDoc._id.toString());
    values.push(deptDoc.name);
  }
  return { deptDoc, values };
}

async function findManagerForEmployee(employeeDept, employeeId) {
  const deptValues = await resolveDepartment(employeeDept);
  console.log('  Employee dept:', employeeDept);
  console.log('  Resolved values:', deptValues.values);
  
  const manager = await User.findOne({ 
    role: 'manager', 
    department: { $in: deptValues.values }, 
    isActive: true 
  }).lean();
  
  if (manager) {
    if (manager._id.toString() !== employeeId.toString()) {
      console.log('  -> Found manager:', manager.name, '(' + manager.department + ')');
      return true;
    } else {
      console.log('  -> Manager is self, skipping');
      return false;
    }
  }
  
  // Reverse: try finding all managers and matching through Department docs
  console.log('  -> No direct manager found, trying reverse...');
  const allManagers = await User.find({ role: 'manager', isActive: true }).lean();
  for (const mgr of allManagers) {
    if (mgr._id.toString() === employeeId.toString()) continue;
    const mgrDept = await resolveDepartment(mgr.department);
    const overlap = deptValues.values.some(v => mgrDept.values.includes(v));
    if (overlap) {
      console.log('  -> Found manager via reverse:', mgr.name, '(' + mgr.department + ')');
      return true;
    }
  }
  console.log('  -> NO manager found');
  return false;
}

async function run() {
  await mongoose.connect('mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/test');
  
  const employees = await User.find({ role: 'employee', isActive: true }, 'name department').lean();
  console.log('=== Testing manager resolution for each employee ===\n');
  
  for (const emp of employees) {
    console.log('Employee:', emp.name, '(' + emp.department + ')');
    const found = await findManagerForEmployee(emp.department, emp._id.toString());
    console.log(found ? '  RESULT: FOUND ✓\n' : '  RESULT: NOT FOUND ✗\n');
  }
  
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
