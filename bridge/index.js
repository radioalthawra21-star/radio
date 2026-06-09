const ZKLib = require('node-zklib');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const config = require('./config');

let device = null;
let lastSyncTime = null;
let knownUsers = [];
let syncInterval = null;
let syncedRecordIds = new Set();
const SYNCED_IDS_FILE = path.join(__dirname, 'synced_ids.json');

function log(level, msg, data) {
  const ts = new Date().toLocaleString('ar-SA');
  const prefix = { info: 'ℹ️', ok: '✅', warn: '⚠️', error: '❌', data: '📊' }[level] || '•';
  console.log(`${prefix} [${ts}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function cleanupSocket() {
  if (device && device.socket) {
    try {
      device.socket.removeAllListeners('close');
      device.socket.removeAllListeners('data');
      device.socket.removeAllListeners('error');
      device.socket.removeAllListeners('connect');
    } catch (e) {
      // ignore cleanup errors
    }
  }
}

async function connectDevice() {
  if (device) {
    cleanupSocket();
    try { await device.disconnect(); } catch (e) { /* ignore */ }
    device = null;
  }
  device = new ZKLib(config.zk.ip, config.zk.port, config.zk.timeout, 5000);
  if (device.socket) {
    device.socket.setMaxListeners(20);
  }
  try {
    await device.createSocket();
    if (device.socket) {
      device.socket.setMaxListeners(20);
    }
    log('ok', `متصل بجهاز ZKTeco على ${config.zk.ip}:${config.zk.port}`);
    return true;
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `فشل الاتصال بالجهاز: ${errMsg}`);
    cleanupSocket();
    device = null;
    return false;
  }
}

async function disconnectDevice() {
  if (!device) return;
  cleanupSocket();
  try {
    await device.disconnect();
    log('info', 'تم فصل الاتصال بالجهاز');
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `خطأ عند فصل الاتصال: ${errMsg}`);
  }
  device = null;
}

async function fetchAttendance() {
  if (!device) {
    if (!(await connectDevice())) return [];
  }
  try {
    const records = await device.getAttendances();
    if (!records || !records.data || records.data.length === 0) {
      log('info', 'لا توجد سجلات جديدة');
      return [];
    }
    return records.data;
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `فشل جلب سجلات الحضور: ${errMsg}`);
    await disconnectDevice();
    return [];
  }
}

async function fetchUsers() {
  if (!device) {
    if (!(await connectDevice())) return [];
  }
  try {
    const result = await device.getUsers();
    if (!result || !result.data) return [];
    knownUsers = result.data;
    log('ok', `تم جلب ${knownUsers.length} مستخدم من الجهاز`);
    return knownUsers;
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `فشل جلب المستخدمين: ${errMsg}`);
    return [];
  }
}

function mapAttendanceRecord(record) {
  const statusMap = {
    0: 'present',
    1: 'late',
  };
  const rawUserId = record.deviceUserId || record.userId || record.user_id || record.uid || '';
  return {
    zkUserId: rawUserId,
    deviceUserId: rawUserId,
    zkRecordId: record.userSn || record.id || record.recordId,
    timestamp: record.timestamp || record.recordTime || record.time,
    status: record.status !== undefined ? statusMap[record.status] || 'present' : 'present',
    verifyMode: record.verifyMode || record.verify_mode || 0,
    deviceName: `ZKTeco_${config.zk.ip}`,
  };
}

function deduplicate(newRecords, existingIds) {
  return newRecords.filter(r => !existingIds.has(r.zkRecordId));
}

async function sendToApi(records) {
  if (records.length === 0) return;
  const chunkSize = 500;
  let saved = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    try {
      const res = await axios.post(`${config.api.baseUrl}/api/zkteco/attendance`, {
        records: chunk,
        source: `bridge_${config.zk.ip}`,
        syncedAt: new Date().toISOString(),
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-key': config.api.key,
        },
        timeout: 30000,
      });
      if (res.data && res.data.success) {
        saved += res.data.saved || 0;
        log('ok', `أرسل ${chunk.length} سجل (الجزء ${Math.floor(i / chunkSize) + 1}/${Math.ceil(records.length / chunkSize)}) - تم استقبال ${res.data.saved || 0}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      log('error', `فشل إرسال الجزء ${Math.floor(i / chunkSize) + 1}: ${msg}`);
      failed += chunk.length;
    }
  }

  if (saved > 0) {
    log('ok', `✅ اكتمل الإرسال: ${saved} محفوظ, ${failed} فاشل من أصل ${records.length}`);
  }
}

function loadSyncedIds() {
  try {
    if (fs.existsSync(SYNCED_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SYNCED_IDS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        syncedRecordIds = new Set(data);
        log('info', `تم تحميل ${syncedRecordIds.size} معرف مزامن من الملف`);
      }
    }
  } catch (err) {
    log('warn', `لم نتمكن من تحميل المعرفات المزامنة: ${err.message}`);
  }
}

function saveSyncedIds() {
  try {
    const arr = Array.from(syncedRecordIds);
    if (arr.length > 100000) {
      // Keep only last 50000 to avoid huge files
      fs.writeFileSync(SYNCED_IDS_FILE, JSON.stringify(arr.slice(-50000)));
    } else {
      fs.writeFileSync(SYNCED_IDS_FILE, JSON.stringify(arr));
    }
  } catch (err) {
    log('warn', `لم نتمكن من حفظ المعرفات المزامنة: ${err.message}`);
  }
}

async function syncDeviceInfo() {
  if (!device && !(await connectDevice())) return;
  try {
    const info = await device.getInfo();
    log('data', `الجهاز: ${info.data?.deviceName || 'ZKTeco'} - بصمات: ${info.data?.fingerprintCount || 0} - مستخدمين: ${info.data?.userCount || 0}`);
  } catch (err) {
    log('warn', `لم نتمكن من قراءة معلومات الجهاز`);
  }
}

async function syncAttendance() {
  log('info', 'بدء مزامنة الحضور...');
  const records = await fetchAttendance();
  if (records.length === 0) return;
  const mapped = records.map(mapAttendanceRecord);

  // Filter out already-synced records
  const newRecords = mapped.filter(r => {
    const id = r.zkRecordId;
    return id && !syncedRecordIds.has(String(id));
  });

  log('data', `تم جلب ${mapped.length} سجل من الجهاز (${newRecords.length} جديدة، ${mapped.length - newRecords.length} مزامنة سابقاً)`);

  if (newRecords.length === 0) {
    log('info', 'لا توجد سجلات جديدة للمزامنة');
    return;
  }

  await sendToApi(newRecords);

  // Mark sent records as synced
  for (const r of newRecords) {
    if (r.zkRecordId) syncedRecordIds.add(String(r.zkRecordId));
  }
  saveSyncedIds();

  if (newRecords.length > 0) {
    lastSyncTime = new Date().toISOString();
  }
}

async function start() {
  log('info', '🚀 بدء تشغيل ZKTeco Bridge Service');
  log('info', `جهاز ZKTeco: ${config.zk.ip}:${config.zk.port}`);
  log('info', `الخادم الرئيسي: ${config.api.baseUrl}`);
  log('info', `دورة المزامنة: كل ${config.pollIntervalMs / 1000} ثانية`);

  loadSyncedIds();
  const connected = await connectDevice();
  if (!connected) {
    log('warn', 'لم يتم الاتصال بالجهاز، سأحاول مرة أخرى في الدورة القادمة');
  } else {
    await syncDeviceInfo();
    await fetchUsers();
    if (config.syncOnStart) {
      log('info', 'مزامنة أولية...');
      await syncAttendance();
    }
  }

  syncInterval = setInterval(syncAttendance, config.pollIntervalMs);
  log('ok', '👍 Bridge جاهز ويعمل');
}

async function shutdown() {
  log('info', '🛑 إيقاف الخدمة...');
  if (syncInterval) clearInterval(syncInterval);
  saveSyncedIds();
  await disconnectDevice();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(err => {
  log('error', `فشل بدء الخدمة: ${err.message}`);
  process.exit(1);
});
