require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', `restore-2026-06-09_14-21`);

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const db = mongoose.connection.db;

    // Backup only what matters: users and recent attendances (last 60 days)
    const users = await db.collection('users').find({}).toArray();
    fs.writeFileSync(path.join(BACKUP_DIR, 'users.json'), JSON.stringify(users, null, 2));
    console.log('users:', users.length);

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recent = await db.collection('attendances').find({ date: { $gte: sixtyDaysAgo } }).toArray();
    fs.writeFileSync(path.join(BACKUP_DIR, 'attendances_recent.json'), JSON.stringify(recent, null, 2));
    console.log('attendances (recent):', recent.length);

    const logs = await db.collection('devicelogs').find({}).toArray();
    fs.writeFileSync(path.join(BACKUP_DIR, 'devicelogs.json'), JSON.stringify(logs, null, 2));
    console.log('devicelogs:', logs.length);

    const errs = await db.collection('biometricerrorlogs').find({}).toArray();
    fs.writeFileSync(path.join(BACKUP_DIR, 'biometricerrorlogs.json'), JSON.stringify(errs, null, 2));
    console.log('biometricerrorlogs:', errs.length);

    console.log('✅ Backup complete:', BACKUP_DIR);
    console.log('');
    console.log('To restore code: git checkout restore-2026-06-09_14-21');
    console.log('To restore DB: manually import JSON files via mongosh or Compass');

    await mongoose.disconnect();
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();
