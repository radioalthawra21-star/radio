/**
 * Diagnostic script to inspect user roles and verify admin account
 * Run: node debug-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models/User');

async function debugUsers() {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management';
    console.log('Connecting to MongoDB:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '://***:***@'));
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    console.log(`📊 Found ${users.length} users:\n`);
    console.log('='.repeat(100));

    for (const user of users) {
      const roleRaw = user.role;
      const roleJSON = JSON.stringify(roleRaw);
      const roleType = typeof roleRaw;
      const roleLen = roleRaw ? roleRaw.length : 0;
      const roleRepr = roleRaw ? `'${roleRaw}'` : 'null';

      console.log(`\n👤 User: ${user.username} (${user.email})`);
      console.log(`   _id: ${user._id.toString()}`);
      console.log(`   role: ${roleRepr}`);
      console.log(`   role (JSON): ${roleJSON}`);
      console.log(`   typeof role: ${roleType}`);
      console.log(`   role length: ${roleLen}`);
      console.log(`   isActive: ${user.isActive}`);
      console.log(`   lastLogin: ${user.lastLogin}`);

      // Show any whitespace issues
      if (roleRaw && (roleRaw !== roleRaw.trim() || roleRaw.toLowerCase() !== 'admin')) {
        console.log(`   ⚠️  ROLE MISMATCH DETECTED!`);
        console.log(`      - trim() => '${roleRaw.trim()}'`);
        console.log(`      - toLowerCase() => '${roleRaw.toLowerCase()}'`);
        console.log(`      - char codes: [${[...roleRaw].map(c => c.charCodeAt(0)).join(', ')}]`);
      }
      console.log('-'.repeat(100));
    }

    // Check specifically for admin users
    console.log('\n\n🔍 Admin check:');
    // Find users with role exactly 'admin'
    const exactAdmins = await User.find({ role: 'admin' }).select('-password');
    console.log(`   Users with exact role 'admin': ${exactAdmins.length}`);
    exactAdmins.forEach(u => console.log(`     - ${u.username} (${u._id})`));

    // Check for any role values that are not exactly expected (case-sensitive)
    const expectedRoles = new Set(['admin', 'manager', 'employee']);
    const unexpected = users.filter(u => !expectedRoles.has(u.role));
    if (unexpected.length > 0) {
      console.log(`\n⚠️ Users with unexpected role values (not in allowed set): ${unexpected.length}`);
      unexpected.forEach(u => console.log(`     - ${u.username}: role=${JSON.stringify(u.role)} (type: ${typeof u.role}, length: ${u.role ? u.role.length : 0})`));
    } else {
      console.log('\n✅ All role values match expected set.');
    }

    // Check for whitespace issues
    const whitespaceIssues = users.filter(u => u.role && (u.role !== u.role.trim() || u.role.includes(' ')));
    if (whitespaceIssues.length > 0) {
      console.log(`\n⚠️ Users with leading/trailing whitespace or internal space in role: ${whitespaceIssues.length}`);
      whitespaceIssues.forEach(u => console.log(`     - ${u.username}: role=${JSON.stringify(u.role)}`));
    } else {
      console.log('\n✅ No whitespace issues in role fields.');
    }

    // Check for multiple potential admin-like accounts
    const adminCandidates = users.filter(u => 
      u.email.includes('admin') || u.username.includes('admin')
    );
    if (adminCandidates.length > 1) {
      console.log(`\n⚠️ Multiple admin-like accounts found (${adminCandidates.length}):`);
      adminCandidates.forEach(u => console.log(`     - ${u.username} (role: ${JSON.stringify(u.role)}, _id: ${u._id})`));
    } else {
      console.log('\n✅ Only one admin-like account.');
    }

    // Check for whitespace in role
    const whitespaceIssues = users.filter(u => u.role && (u.role !== u.role.trim() || u.role.includes(' ')));
    if (whitespaceIssues.length > 0) {
      console.log(`\n⚠️ Users with leading/trailing whitespace in role: ${whitespaceIssues.length}`);
      whitespaceIssues.forEach(u => console.log(`     - ${u.username}: role='${u.role}'`));
    }

    // Find potential duplicate admins (by email pattern)
    const adminCandidates = users.filter(u => 
      u.email.includes('admin') || u.username.includes('admin')
    );
    if (adminCandidates.length > 1) {
      console.log(`   ⚠️ Multiple admin-like accounts found (${adminCandidates.length}):`);
      adminCandidates.forEach(u => console.log(`     - ${u.username} (role: '${u.role}', _id: ${u._id})`));
    }

    await mongoose.disconnect();
    console.log('\n✅ Debug complete. Disconnected.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugUsers();
