/**
 * Migration Script: Embed profile images as base64 data URIs in MongoDB
 * This ensures images work on Render (ephemeral storage)
 * Run: node scripts/migrate-images.js
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROD_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function migrateImages() {
  console.log('Connecting to MongoDB Atlas...');
  const conn = await mongoose.createConnection(PROD_URI).asPromise();
  console.log('Connected to:', conn.name);

  const users = await conn.db.collection('users').find({ profileImage: { $ne: null } }).toArray();
  console.log(`Found ${users.length} users with profile images`);

  let updated = 0;
  for (const user of users) {
    const imagePath = user.profileImage;
    // Skip if already a data URI
    if (imagePath.startsWith('data:')) {
      console.log(`  Skipping ${user.username} - already data URI`);
      continue;
    }

    // Extract filename from path
    const filename = path.basename(imagePath);
    const filepath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filepath)) {
      const ext = path.extname(filename).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/gif';
      const base64 = fs.readFileSync(filepath, { encoding: 'base64' });
      const dataUri = `data:${mimeType};base64,${base64}`;

      await conn.db.collection('users').updateOne(
        { _id: user._id },
        { $set: { profileImage: dataUri } }
      );
      console.log(`  Updated ${user.username}: ${filename} -> data URI (${Math.round(base64.length / 1024)} KB)`);
      updated++;
    } else {
      console.log(`  File not found for ${user.username}: ${filepath}`);
    }
  }

  console.log(`\nDone! Updated ${updated} users.`);
  console.log('Also embedding CV files if present...');

  // Also handle CV files
  const usersWithCv = await conn.db.collection('users').find({ cvUrl: { $ne: null, $not: /^data:/ } }).toArray();
  let cvUpdated = 0;
  for (const user of usersWithCv) {
    const cvPath = user.cvUrl;
    const filename = path.basename(cvPath);
    const filepath = path.join(UPLOADS_DIR, 'cv', filename);
    if (!fs.existsSync(filepath)) {
      const altPath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(altPath)) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        const base64 = fs.readFileSync(altPath, { encoding: 'base64' });
        const dataUri = `data:${mimeType};base64,${base64}`;
        await conn.db.collection('users').updateOne(
          { _id: user._id },
          { $set: { cvUrl: dataUri } }
        );
        console.log(`  Updated CV for ${user.username}`);
        cvUpdated++;
      }
    }
  }
  console.log(`Done! Updated ${cvUpdated} CVs.`);

  await conn.close();
}

migrateImages().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
