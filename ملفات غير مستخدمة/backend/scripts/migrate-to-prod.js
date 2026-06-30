/**
 * Migration Script: Copy local MongoDB data to production MongoDB Atlas
 * Run: node scripts/migrate-to-prod.js
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROD_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const LOCAL_URI = 'mongodb://localhost:27017/employee_task_management';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function migrate() {
  console.log('Connecting to LOCAL database...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('Connected to LOCAL:', localConn.name);

  console.log('Connecting to PRODUCTION database...');
  const prodConn = await mongoose.createConnection(PROD_URI).asPromise();
  console.log('Connected to PRODUCTION:', prodConn.name);

  const collectionNames = await localConn.db.listCollections().toArray();
  const names = collectionNames.map(c => c.name).filter(n => !n.startsWith('system.'));

  for (const name of names) {
    console.log(`\nMigrating collection: ${name}`);
    const localDocs = await localConn.db.collection(name).find({}).toArray();
    console.log(`  Found ${localDocs.length} documents locally`);

    if (localDocs.length === 0) continue;

    const prodCol = prodConn.db.collection(name);

    if (name === 'users') {
      for (const doc of localDocs) {
        const profileImage = doc.profileImage;
        if (profileImage) {
          const filename = path.basename(profileImage);
          const filepath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filepath)) {
            const ext = path.extname(filename).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/gif';
            const base64 = fs.readFileSync(filepath, { encoding: 'base64' });
            doc.profileImage = `data:${mimeType};base64,${base64}`;
            console.log(`  Embedded image for user: ${doc.username || doc.email}`);
          } else {
            console.log(`  Image file not found for ${doc.username || doc.email}: ${filepath}`);
            doc.profileImage = null;
          }
        }
      }
    }

    await prodCol.deleteMany({});
    await prodCol.insertMany(localDocs);
    console.log(`  Inserted ${localDocs.length} documents into production`);
  }

  await localConn.close();
  await prodConn.close();
  console.log('\nMigration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
