require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');
    const targetIds = ['1001','1002','1003','1004','1005','1006','1007','1008','1009','1010','1011','1012','1014','1015','1016','1017','1018','1019','1020','1029','1031','1036','1046','1052'];
    const users = await mongoose.connection.db.collection('users').find({ zkUserId: { $in: targetIds } }).toArray();
    console.log('Found:', users.length);
    users.forEach(u => console.log(u.zkUserId, '|', u.name, '|', u.email, '|', u.department));
    await mongoose.disconnect();
  } catch(e) { console.error(e.message); }
})();
