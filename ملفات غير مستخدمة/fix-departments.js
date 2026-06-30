require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/Department');

async function fixDepartments() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected\n');

    // Show all departments before changes
    const allBefore = await Department.find({}).select('_id name isSystem');
    console.log('Departments BEFORE changes:');
    allBefore.forEach(d => console.log(`  ${d._id}: ${d.name} (isSystem: ${d.isSystem})`));

    // 1. Delete "marketin" department if exists
    const marketin = await Department.findOne({ name: 'marketin' });
    if (marketin) {
      await Department.findByIdAndDelete(marketin._id);
      console.log(`\n❌ Deleted department: marketin (${marketin._id})`);
    } else {
      console.log('\n✓ No "marketin" department found to delete');
    }

    // 2. Update all remaining departments to isSystem: true
    const result = await Department.updateMany(
      {}, 
      { $set: { isSystem: true } }
    );
    console.log(`\n✅ Set isSystem=true for ${result.modifiedCount} departments`);

    // Show all departments after changes
    const allAfter = await Department.find({}).select('_id name isSystem');
    console.log('\nDepartments AFTER changes:');
    allAfter.forEach(d => console.log(`  ${d._id}: ${d.name} (isSystem: ${d.isSystem})`));

    await mongoose.disconnect();
    console.log('\n✅ Done. Disconnected.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDepartments();
