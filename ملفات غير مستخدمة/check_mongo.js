const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee_task_management';
  console.log('Connecting to:', uri.replace(/\/\/.*@/, '//<credentials>@'));
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const totalCount = await db.collection('attendances').countDocuments();
  console.log('Total attendance records:', totalCount);
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  console.log('Today range:', todayStart.toISOString(), '-', todayEnd.toISOString());
  
  const todayCount = await db.collection('attendances').find({
    $or: [
      { date: { $gte: todayStart, $lt: todayEnd } },
      { 'checkIn.time': { $gte: todayStart, $lt: todayEnd } }
    ]
  }).toArray();
  console.log('Today records count:', todayCount.length);
  
  todayCount.forEach(r => console.log('  Record:', r._id, '| date:', r.date, '| employee:', r.employee, '| device:', r.deviceUserName, '| checkIn:', r.checkIn?.time, '| checkOut:', r.checkOut?.time, '| createdAt:', r.createdAt));
  
  const last5 = await db.collection('attendances').find().sort({createdAt: -1}).limit(5).toArray();
  console.log('\nLast 5 by createdAt:', JSON.stringify(last5.map(r => ({
    _id: r._id,
    date: r.date,
    employee: r.employee,
    deviceUserName: r.deviceUserName,
    status: r.status,
    checkIn: r.checkIn?.time,
    checkOut: r.checkOut?.time,
    createdAt: r.createdAt
  })), null, 2));
  
  await mongoose.disconnect();
}
check().catch(err => { console.error('Error:', err); process.exit(1); });
