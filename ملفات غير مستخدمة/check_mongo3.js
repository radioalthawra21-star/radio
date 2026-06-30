const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Today's range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  
  console.log('Today:', todayStart, 'to', todayEnd);
  
  // Test simple date query (should be fast with index)
  console.time('date-query');
  const byDate = await db.collection('attendances').find({
    date: { $gte: todayStart, $lt: todayEnd }
  }).sort({ 'checkIn.time': -1 }).toArray();
  console.timeEnd('date-query');
  console.log('By date count:', byDate.length);
  
  // Test OR query (might be slow)
  console.time('or-query');
  const byOr = await db.collection('attendances').find({
    $or: [
      { date: { $gte: todayStart, $lt: todayEnd } },
      { 'checkIn.time': { $gte: todayStart, $lt: todayEnd } },
      { 'checkOut.time': { $gte: todayStart, $lt: todayEnd } },
      { createdAt: { $gte: todayStart, $lt: todayEnd } }
    ]
  }).sort({ 'checkIn.time': -1, createdAt: -1 }).toArray();
  console.timeEnd('or-query');
  console.log('By OR count:', byOr.length);
  
  // Check existing indexes
  console.time('indexes');
  const indexes = await db.collection('attendances').indexes();
  console.timeEnd('indexes');
  console.log('Indexes:', JSON.stringify(indexes.map(i => ({ name: i.name, key: i.key })), null, 2));
  
  // Check for slow queries in mongodb logs... actually let's just analyze
  // Count records where date is today
  const todayDateOnly = byDate.length;
  // Count records where createdAt is today but date is not today
  const createdTodayNotDate = await db.collection('attendances').countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
    date: { $lt: todayStart }
  });
  console.log('Created today but date before today:', createdTodayNotDate);
  
  // Count records where checkIn is today but date is not today
  const checkInTodayNotDate = await db.collection('attendances').countDocuments({
    'checkIn.time': { $gte: todayStart, $lt: todayEnd },
    date: { $lt: todayStart }
  });
  console.log('CheckIn today but date before today:', checkInTodayNotDate);
  
  await mongoose.disconnect();
}
check().catch(err => { console.error('Error:', err); process.exit(1); });
