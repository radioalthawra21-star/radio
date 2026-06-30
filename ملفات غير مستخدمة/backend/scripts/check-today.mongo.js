const mongoose = require('mongoose');
require('dotenv').config();
require('../models/User');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
    const { Attendance } = require('../models/Attendance');
    const today = new Date('2026-06-08T00:00:00.000Z');
    const tomorrow = new Date('2026-06-09T00:00:00.000Z');
    const records = await Attendance.find({
        $or: [
            { date: { $gte: today, $lt: tomorrow } },
            { 'checkIn.time': { $gte: today, $lt: tomorrow } },
            { 'checkOut.time': { $gte: today, $lt: tomorrow } },
            { createdAt: { $gte: today, $lt: tomorrow } }
        ]
    }).populate('employee', 'name email zkUserId').lean();
    console.log('Today records:', records.length);
    records.forEach(r => {
        console.log(JSON.stringify({
            _id: r._id,
            employee: r.employee ? r.employee.name : 'NONE',
            deviceUserId: r.deviceUserId,
            date: r.date,
            checkIn: r.checkIn?.time || null,
            checkOut: r.checkOut?.time || null,
            createdAt: r.createdAt
        }));
    });
    await mongoose.disconnect();
})();
