const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/test')
.then(async () => {
  const total = await mongoose.connection.db.collection('attendances').countDocuments();
  const withEmployee = await mongoose.connection.db.collection('attendances').countDocuments({ employee: { $ne: null } });
  const withDevice = await mongoose.connection.db.collection('attendances').countDocuments({ deviceUserId: { $ne: null, $ne: '' } });
  const emptyDevice = await mongoose.connection.db.collection('attendances').countDocuments({ deviceUserId: '' });
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayRecords = await mongoose.connection.db.collection('attendances').countDocuments({ date: { $gte: today } });
  
  console.log('Total records:', total);
  console.log('With employee (linked):', withEmployee);
  console.log('With deviceUserId (non-empty):', withDevice);
  console.log('With empty deviceUserId:', emptyDevice);
  console.log('Today records:', todayRecords);

  // Show breakdown by month for 2026
  const pipeline = [
    { $match: { date: { $gte: new Date('2026-01-01') } } },
    { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ];
  const monthly = await mongoose.connection.db.collection('attendances').aggregate(pipeline).toArray();
  console.log('Monthly breakdown (2026):');
  monthly.forEach(m => console.log(`  ${m._id.year}-${String(m._id.month).padStart(2,'0')}: ${m.count}`));

  // Most recent records
  console.log('Most recent records:');
  const recent = await mongoose.connection.db.collection('attendances').find().sort({ date: -1 }).limit(5).toArray();
  recent.forEach(r => console.log(' -', r.date, '| emp:', r.employee ? String(r.employee).slice(-6) : 'null', '| devId:', r.deviceUserId, '|', r.deviceUserName));

  await mongoose.disconnect();
  process.exit(0);
})
.catch(e => { console.error(e.message); process.exit(1); });
