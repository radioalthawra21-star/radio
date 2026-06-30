const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Records by month
  const pipeline = [
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $limit: 12 }
  ];
  const byMonth = await db.collection('attendances').aggregate(pipeline).toArray();
  console.log('Records by month (last 12):');
  byMonth.forEach(r => console.log(' ', r._id, ':', r.count));
  
  // Last 7 days by date field
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekCount = await db.collection('attendances').countDocuments({ date: { $gte: weekAgo } });
  console.log('\nRecords in last 7 days (by date):', weekCount);
  
  // Last 7 days by checkIn time
  const checkInWeek = await db.collection('attendances').countDocuments({ 'checkIn.time': { $gte: weekAgo } });
  console.log('Records with checkIn in last 7 days:', checkInWeek);
  
  // Records created in last hour
  const hourAgo = new Date(Date.now() - 3600000);
  const recentCreated = await db.collection('attendances').countDocuments({ createdAt: { $gte: hourAgo } });
  console.log('Records created in last hour:', recentCreated);
  
  // Distinct dates
  let distinctDates = await db.collection('attendances').distinct('date');
  distinctDates = distinctDates.sort((a,b) => b - a).slice(0, 10);
  console.log('\nLast 10 distinct dates:', distinctDates.map(d => d.toISOString().split('T')[0]));
  
  // Count records with no employee mapped (device records only)
  const unMapped = await db.collection('attendances').countDocuments({ employee: { $exists: false } });
  console.log('Records without employee mapping:', unMapped);
  
  // Count records with device only (no employee)
  const deviceOnly = await db.collection('attendances').countDocuments({ deviceUserId: { $exists: true }, employee: { $exists: false } });
  console.log('Records with deviceUserId but no employee:', deviceOnly);
  
  await mongoose.disconnect();
}
check().catch(err => { console.error('Error:', err); process.exit(1); });
