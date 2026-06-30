require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('./models/Department');

const TARGET_DEPARTMENTS = [
  'المالي', 'تقنية المعلومات', 'التسويق',
  'الأخبار', 'الإنتاج', 'البث المباشر', 'الموارد البشرية'
];

const DEPT_CONFIG = {
  'المالي':           { color: '#EF4444', description: 'القسم المالي والمحاسبة' },
  'تقنية المعلومات':  { color: '#8B5CF6', description: 'قسم تقنية المعلومات' },
  'التسويق':          { color: '#F59E0B', description: 'قسم التسويق والعلاقات' },
  'الأخبار':          { color: '#10B981', description: 'قسم الأخبار والمحتوى' },
  'الإنتاج':          { color: '#3B82F6', description: 'قسم الإنتاج' },
  'البث المباشر':     { color: '#06B6D4', description: 'قسم البث المباشر' },
  'الموارد البشرية':  { color: '#EC4899', description: 'قسم الموارد البشرية' }
};

async function migrateDepartments() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected\n');

    const allBefore = await Department.find({}).select('_id name isSystem');
    console.log('Departments BEFORE migration:');
    allBefore.forEach(d => console.log(`  ${d._id}: ${d.name} (isSystem: ${d.isSystem})`));

    let deletedCount = 0;
    let createdCount = 0;

    for (const dept of allBefore) {
      if (!TARGET_DEPARTMENTS.includes(dept.name)) {
        await Department.findByIdAndDelete(dept._id);
        console.log(`\n❌ Deleted: ${dept.name} (${dept._id})`);
        deletedCount++;
      }
    }

    for (const name of TARGET_DEPARTMENTS) {
      const existing = await Department.findOne({ name });
      if (!existing) {
        const config = DEPT_CONFIG[name];
        await Department.create({
          name,
          color: config.color,
          description: config.description,
          isSystem: true
        });
        console.log(`\n✅ Created: ${name}`);
        createdCount++;
      } else if (!existing.isSystem) {
        existing.isSystem = true;
        await existing.save();
        console.log(`\n🔄 Updated to isSystem=true: ${name}`);
      }
    }

    const allAfter = await Department.find({}).select('_id name isSystem');
    console.log('\n\nDepartments AFTER migration:');
    allAfter.forEach(d => console.log(`  ${d._id}: ${d.name} (isSystem: ${d.isSystem})`));

    console.log(`\n\n📊 Summary:`);
    console.log(`  Deleted: ${deletedCount}`);
    console.log(`  Created: ${createdCount}`);
    console.log(`  Total departments now: ${allAfter.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateDepartments();
