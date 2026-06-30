require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Attendance = mongoose.connection.db.collection('attendances');
    const User = mongoose.connection.db.collection('users');
    const targetIds = ['1001','1003','1005','1008','1010','1015','1016'];
    const users = await User.find({ zkUserId: { $in: targetIds } }).toArray();
    const userIds = users.map(u => u._id);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0,0,0,0);
    const records = await Attendance.find({ employee: { $in: userIds }, date: { $gte: cutoff } }).toArray();
    
    const groups = {};
    for (const r of records) {
      const empId = String(r.employee);
      const d = new Date(r.date);
      const ds = d.toISOString().split('T')[0];
      const key = empId + '_' + ds;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    
    let dupCount = 0;
    for (const [key, recs] of Object.entries(groups)) {
      if (recs.length > 1) {
        dupCount++;
        const emp = users.find(u => String(u._id) === String(recs[0].employee));
        console.log(key, emp ? emp.name : '?', 'x' + recs.length);
        for (const r of recs) {
          const ci = r.checkIn?.time ? new Date(r.checkIn.time).toLocaleString('ar-SA', {timeZone:'Asia/Riyadh'}) : '-';
          const co = r.checkOut?.time ? new Date(r.checkOut.time).toLocaleString('ar-SA', {timeZone:'Asia/Riyadh'}) : '-';
          console.log('  _id:' + String(r._id).slice(-6), 'date:' + r.date.toISOString(), 'CI:' + ci, 'CO:' + co);
        }
      }
    }
    console.log('');
    console.log('Total records:', records.length);
    console.log('Unique (user+ISOdate) groups:', Object.keys(groups).length);
    console.log('Groups with duplicates:', dupCount);
    console.log('Excess records:', records.length - Object.keys(groups).length);
    await mongoose.disconnect();
  } catch(e) { console.error(e); }
})();
