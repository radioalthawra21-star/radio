require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Attendance = require('../models/Attendance').Attendance;
    const User = require('../models/User').User;
    const targetIds = ['1001','1003','1005','1008','1010','1015','1016'];
    const users = await User.find({ zkUserId: { $in: targetIds } }).lean();
    const userIds = users.map(u => u._id);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); cutoff.setHours(0,0,0,0);
    const records = await Attendance.find({ employee: { $in: userIds }, date: { $gte: cutoff } }).populate('employee', 'name zkUserId').lean();
    for (const r of records) {
      const d = new Date(r.date);
      const ci = r.checkIn?.time ? new Date(r.checkIn.time).toLocaleString('ar-SA', {timeZone:'Asia/Riyadh'}) : '-';
      const co = r.checkOut?.time ? new Date(r.checkOut.time).toLocaleString('ar-SA', {timeZone:'Asia/Riyadh'}) : '-';
      console.log(r.employee?.zkUserId, r.employee?.name, d.toISOString().split('T')[0], 'CI:', ci, 'CO:', co);
    }
    await mongoose.disconnect();
  } catch(e) { console.error(e.message); }
})();
