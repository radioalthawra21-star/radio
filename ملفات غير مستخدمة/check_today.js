const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-tasks');

  const db = mongoose.connection.db;
  const dbName = db.databaseName;
  console.log('Database:', dbName);

  const total = await db.collection('attendances').countDocuments();
  console.log('Total records:', total);

  const sample = await db.collection('attendances').findOne();
  console.log('Any record:', sample ? 
    'date: ' + sample.date + ' createdAt: ' + sample.createdAt : 'NONE');

  const recent = await db.collection('attendances')
    .find({}, { sort: { _id: -1 }, limit: 3 })
    .toArray();
  console.log('Recent by _id desc:');
  recent.forEach(r => console.log('  _id:', r._id, 'createdAt:', r.createdAt));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  
  const byCreated = await db.collection('attendances')
    .countDocuments({ createdAt: { $gte: today, $lt: end } });
  console.log('Created today:', byCreated);

  await mongoose.disconnect();
}

check().catch(e => { console.error(e.message); process.exit(1); });
