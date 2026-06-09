const mongoose = require('mongoose');
const connectDB = require('./config/db');
async function check() {
  await connectDB();
  const db = mongoose.connection.db;
  
  const totalCount = await db.collection('attendances').countDocuments();
  console.log('Total attendance records:', totalCount);
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  const todayCount = await db.collection('attendances').countDocuments({
    date: { $gte: todayStart, $lt: todayEnd }
  });
  console.log('Today attendance records:', todayCount);
  
  if (todayCount > 0) {
    const todayRecords = await db.collection('attendances').find({
      date: { $gte: todayStart, $lt: todayEnd }
    }).limit(5).toArray();
    console.log('Sample today records:', JSON.stringify(todayRecords, null, 2));
  }
  
  const last5 = await db.collection('attendances').find().sort({date: -1}).limit(5).toArray();
  console.log('Last 5 records:', JSON.stringify(last5.map(r => ({
    _id: r._id,
    date: r.date,
    employee: r.employee,
    deviceUserId: r.deviceUserId,
    status: r.status,
    'checkIn.time': r.checkIn?.time,
    'checkOut.time': r.checkOut?.time
  })), null, 2));
  
  const checkInTodayCount = await db.collection('attendances').countDocuments({
    'checkIn.time': { $gte: todayStart, $lt: todayEnd }
  });
  console.log('Records with checkIn today:', checkInTodayCount);
  
  await mongoose.disconnect();
}
check().catch(console.error);
