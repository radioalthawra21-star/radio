/**
 * Device User → System User Mapping Suggestions
 * =============================================
 * Reads device users and system users, cross-references by:
 *   - employeeId (if they match deviceUserId)
 *   - Arabic name similarity (decoding garbled names)
 *   - Name substring matching
 *
 * Output: Suggested mappings + copy-paste commands to execute
 *
 * Usage: node scripts/suggest-mappings.js [--apply]
 *   --apply    Actually apply the suggested mappings to the DB
 *   --list     Just list device and system users for reference
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { User } = require('../models/User');

let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {
  console.error('node-zklib not installed');
  process.exit(1);
}

const DEVICE_IP = process.env.ZK_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');

/**
 * Decode garbled Arabic text typed with English keyboard layout
 * e.g., "NXmH GaGOaHm QGOmf" → Arabic equivalent
 */
function decodeGarbledArabic(text) {
  if (!text || text === 'N/A') return null;
  const layout = {
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع',
    'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'د', 'a': 'ش', 's': 'س',
    'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م',
    ';': 'ك', "'": 'ط', 'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا',
    'n': 'ى', 'm': 'ة', ',': 'و', '.': 'ز', '/': 'ظ',
    'Q': 'َ', 'W': 'ً', 'E': 'ُ', 'R': 'ٌ', 'T': 'ِ', 'Y': 'ٍ', 'U': 'ّ',
    'I': 'ْ', 'O': 'ٓ', 'P': 'ٔ', 'A': 'َ', 'S': 'ً', 'D': 'ُ',
    'F': 'ٌ', 'G': 'ِ', 'H': 'ٍ', 'J': 'ّ', 'K': 'ْ',
    'Z': 'َ', 'X': 'ً', 'C': 'ُ', 'V': 'ٌ', 'B': 'ِ', 'N': 'ٍ', 'M': 'ّ',
    '_': ' ', ']': ']', '[': '[',
  };
  let result = '';
  for (const ch of text) {
    result += layout[ch.toLowerCase()] || layout[ch] || ch;
  }
  return result;
}

/**
 * Arabic keyboard phonetics — the names look like they were typed using
 * an English keyboard while the user thought they were typing Arabic.
 * Common patterns:
 *   "cMcO" = "محمد" (m-h-m-d typed as cMcO)
 *   "Ga" = "ال" (al-)
 *   "QGOmf" = "فرج" (f-r-j) or "فوزي" etc
 */
function decodeName(text) {
  if (!text || text === 'N/A') return null;

  // Use the English-to-Arabic keyboard mapping
  // English letters on an Arabic keyboard produce Arabic letters
  const en2ar = {
    'q': 'ض', 'Q': 'ض',
    'w': 'ص', 'W': 'ص',
    'e': 'ث', 'E': 'ث',
    'r': 'ق', 'R': 'ق',
    't': 'ف', 'T': 'ف',
    'y': 'غ', 'Y': 'غ',
    'u': 'ع', 'U': 'ع',
    'i': 'ه', 'I': 'ه',
    'o': 'خ', 'O': 'خ',
    'p': 'ح', 'P': 'ح',
    'a': 'ش', 'A': 'ش',
    's': 'س', 'S': 'س',
    'd': 'ي', 'D': 'ي',
    'f': 'ب', 'F': 'ب',
    'g': 'ل', 'G': 'ل',
    'h': 'ا', 'H': 'ا',
    'j': 'ت', 'J': 'ت',
    'k': 'ن', 'K': 'ن',
    'l': 'م', 'L': 'م',
    ';': 'ك',
    "'": 'ط',
    'z': 'ئ', 'Z': 'ئ',
    'x': 'ء', 'X': 'ء',
    'c': 'ؤ', 'C': 'ؤ',
    'v': 'ر', 'V': 'ر',
    'b': 'لا', 'B': 'لا',
    'n': 'ى', 'N': 'ى',
    'm': 'ة', 'M': 'ة',
    ',': 'و',
    '.': 'ز',
    '/': 'ظ',
  };

  let decoded = '';
  for (const ch of text) {
    decoded += en2ar[ch] || ch;
  }
  return decoded;
}

// Common Arabic name substitutions to handle the reversed keyboard
const namePatterns = [
  // Pattern: "cMcO" = common opening for محمد
  { pattern: /^cMcO/, replace: 'محمد' },
  // "Ga" = ال
  { pattern: /Ga/g, replace: 'ال' },
  // "GH" or "GaH" = الله
  { pattern: /GaH/g, replace: 'الله' },
  // "cLO" = مؤمن or similar
  { pattern: /cLO/, replace: 'مؤمن' },
  // "QGOmf" = ends with ...
  { pattern: /QGOmf$/, replace: 'فرج' },
  // "ZOdGd" = سعيد
  { pattern: /ZOdGd/, replace: 'سعيد' },
  // "cMc" = محم
  { pattern: /cMc/, replace: 'محم' },
  // "Ga" at start = ال
  { pattern: /^Ga/, replace: 'ال' },
  // "MGO" = ...
];

function normalizeForComparison(s) {
  if (!s) return '';
  return s.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '').toLowerCase();
}

// Arabic normalization
function normalizeArabic(s) {
  if (!s) return '';
  return s
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/گ/g, 'ك')
    .replace(/[ًٌٍَُِّ]/g, '')
    .trim();
}

function similarity(a, b) {
  const na = normalizeArabic(normalizeForComparison(a));
  const nb = normalizeArabic(normalizeForComparison(b));
  if (!na || !nb) return 0;

  // Exact match
  if (na === nb) return 1;

  // Substring match
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  // Word overlap
  const wordsA = na.split(/\s+/);
  const wordsB = nb.split(/\s+/);
  const common = wordsA.filter(w => wordsB.includes(w)).length;
  if (common > 0) return 0.5 * (common / Math.max(wordsA.length, wordsB.length));

  return 0;
}

(async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const listOnly = args.includes('--list');

  // ─── Connect to device ───
  console.log('Connecting to device...');
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 5000, 5000);
  await device.createSocket();
  const usersResult = await device.getUsers();
  const deviceUsers = usersResult.data || [];
  await device.disconnect();
  console.log(`Device users: ${deviceUsers.length}`);

  // ─── Connect to DB ───
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/employee_task_management');
  const systemUsers = await User.find({}, 'name email username department employeeId zkUserId role').lean();
  console.log(`System users: ${systemUsers.length}`);
  console.log('');

  if (listOnly) {
    console.log('═══════════════════════════════════════');
    console.log('  DEVICE USERS');
    console.log('═══════════════════════════════════════');
    deviceUsers.forEach(u => {
      const uid = u.userId || u.user_id || u.id || '?';
      const name = u.name || 'N/A';
      const decoded = decodeName(name);
      console.log(`  ${uid.padEnd(8)} ${name.padEnd(24)} ${decoded !== name ? '→ ' + decoded : ''}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  SYSTEM USERS');
    console.log('═══════════════════════════════════════');
    systemUsers.forEach(u => {
      console.log(`  ${u.employeeId ? u.employeeId.padEnd(8) : 'N/A'.padEnd(8)} ${(u.name || '').padEnd(24)} ${u.department || ''} ${u.zkUserId ? '(zk:' + u.zkUserId + ')' : ''}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  }

  // ─── Build suggested mappings ───
  const userDeviceIdMap = {};
  systemUsers.forEach(u => {
    if (u.employeeId) userDeviceIdMap[u.employeeId] = u;
  });

  const suggestions = [];

  for (const du of deviceUsers) {
    const deviceId = String(du.userId || du.user_id || du.id || '');
    const deviceName = du.name || '';
    const decodedName = decodeName(deviceName);

    // Check if already mapped
    const alreadyMapped = systemUsers.find(u => u.zkUserId === deviceId);
    if (alreadyMapped) {
      console.log(`✓ ${deviceId} → ${alreadyMapped.name} (already mapped)`);
      continue;
    }

    // Try matching by employeeId
    if (userDeviceIdMap[deviceId]) {
      suggestions.push({
        deviceUserId: deviceId,
        deviceName: deviceName,
        decodedName: decodedName,
        systemUser: userDeviceIdMap[deviceId],
        matchType: 'employeeId',
        confidence: 1.0
      });
      continue;
    }

    // Try matching by name similarity
    const candidates = systemUsers.map(su => ({
      systemUser: su,
      score: Math.max(
        similarity(deviceName, su.name),
        similarity(decodedName, su.name),
        similarity(deviceName, su.username || ''),
        similarity(decodedName, su.username || '')
      )
    })).filter(c => c.score > 0.3)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      suggestions.push({
        deviceUserId: deviceId,
        deviceName: deviceName,
        decodedName: decodedName,
        systemUser: candidates[0].systemUser,
        matchType: 'name_similarity',
        confidence: candidates[0].score,
        alternatives: candidates.slice(0, 3)
      });
    } else {
      // No match found
      suggestions.push({
        deviceUserId: deviceId,
        deviceName: deviceName,
        decodedName: decodedName,
        systemUser: null,
        matchType: 'no_match',
        confidence: 0
      });
    }
  }

  // ─── Display results ───
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  SUGGESTED MAPPINGS');
  console.log('═══════════════════════════════════════');
  console.log('');

  const highConf = suggestions.filter(s => s.confidence >= 0.8);
  const mediumConf = suggestions.filter(s => s.confidence >= 0.3 && s.confidence < 0.8);
  const noMatch = suggestions.filter(s => s.confidence < 0.3 || !s.systemUser);

  if (highConf.length > 0) {
    console.log(`─── HIGH CONFIDENCE (${highConf.length}) ───`);
    highConf.forEach(s => {
      console.log(`  ${s.deviceUserId.padEnd(8)} "${s.deviceName.substring(0, 20).padEnd(22)}" → ${s.systemUser.name} (${s.systemUser.department || '-'})`);
    });
    console.log('');
  }

  if (mediumConf.length > 0) {
    console.log(`─── MEDIUM CONFIDENCE (${mediumConf.length}) ───`);
    mediumConf.forEach(s => {
      console.log(`  ${s.deviceUserId.padEnd(8)} "${s.deviceName.substring(0, 20).padEnd(22)}" → ${s.systemUser.name} (${s.systemUser.department || '-'}) [${Math.round(s.confidence * 100)}%]`);
    });
    console.log('');
  }

  if (noMatch.length > 0) {
    console.log(`─── NO MATCH FOUND (${noMatch.length}) ───`);
    noMatch.forEach(s => {
      const decoded = s.decodedName !== s.deviceName ? ` (decoded: ${s.decodedName})` : '';
      console.log(`  ${s.deviceUserId.padEnd(8)} "${s.deviceName.substring(0, 20).padEnd(22)}"${decoded} — NO MATCH`);
    });
    console.log('');
  }

  // ─── Generate API commands ───
  if (apply && highConf.length > 0) {
    const { Attendance } = require('../models/Attendance');
    console.log('─── APPLYING HIGH CONFIDENCE MAPPINGS ───');
    let applied = 0;
    for (const s of highConf) {
      try {
        s.systemUser.zkUserId = s.deviceUserId;
        await s.systemUser.save();
        const updated = await Attendance.updateMany(
          { deviceUserId: s.deviceUserId, employee: { $exists: false } },
          { $set: { employee: s.systemUser._id, department: s.systemUser.department } }
        );
        console.log(`  ✓ ${s.deviceUserId} → ${s.systemUser.name} (${updated.modifiedCount} records updated)`);
        applied++;
      } catch (err) {
        console.log(`  ✗ ${s.deviceUserId} → ${s.systemUser.name}: ${err.message}`);
      }
    }
    console.log(`  Applied ${applied}/${highConf.length} mappings`);
  } else if (apply) {
    console.log('No high-confidence mappings to apply.');
  }

  if (!apply && highConf.length > 0) {
    console.log('─── TO APPLY, RUN ───');
    console.log('  node scripts/suggest-mappings.js --apply');
    console.log('');
    console.log('  Or use the API directly:');
    for (const s of highConf) {
      console.log(`  curl -X POST http://localhost:3000/api/zkteco/map-user \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -H "Authorization: Bearer <token>" \\`);
      console.log(`    -d '{"userId":"${s.systemUser._id}","deviceUserId":"${s.deviceUserId}"}'`);
    }
  }

  await mongoose.disconnect();
  console.log('');
  console.log('Done.');
})();
