const ZKLib = require('node-zklib');
const axios = require('axios');
const config = require('./config');

let device = null;
let lastSyncTime = null;
let knownUsers = [];
let syncInterval = null;

function log(level, msg, data) {
  const ts = new Date().toLocaleString('ar-SA');
  const prefix = { info: 'ℹ️', ok: '✅', warn: '⚠️', error: '❌', data: '📊' }[level] || '•';
  console.log(`${prefix} [${ts}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

async function connectDevice() {
  device = new ZKLib(config.zk.ip, config.zk.port, config.zk.timeout, 5000);
  try {
    await device.createSocket();
    log('ok', `متصل بجهاز ZKTeco على ${config.zk.ip}:${config.zk.port}`);
    return true;
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `فشل الاتصال بالجهاز: ${errMsg}`);
    device = null;
    return false;
  }
}

async function disconnectDevice() {
  if (!device) return;
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
  return {
    zkUserId: record.userId || record.user_id || record.uid,
    zkRecordId: record.id || record.recordId,
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
  try {
    const res = await axios.post(`${config.api.baseUrl}/api/zkteco/attendance`, {
      records,
      source: `bridge_${config.zk.ip}`,
      syncedAt: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-key': config.api.key,
      },
      timeout: 10000,
    });
    if (res.data && res.data.success) {
      log('ok', `أرسل ${records.length} سجل حضور - تم استقبال ${res.data.saved || 0}`);
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    log('error', `فشل إرسال السجلات للخادم: ${msg}`);
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
  log('data', `تم جلب ${mapped.length} سجل من الجهاز`);
  await sendToApi(mapped);
  if (mapped.length > 0) {
    lastSyncTime = new Date().toISOString();
  }
}

async function start() {
  log('info', '🚀 بدء تشغيل ZKTeco Bridge Service');
  log('info', `جهاز ZKTeco: ${config.zk.ip}:${config.zk.port}`);
  log('info', `الخادم الرئيسي: ${config.api.baseUrl}`);
  log('info', `دورة المزامنة: كل ${config.pollIntervalMs / 1000} ثانية`);

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
  await disconnectDevice();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(err => {
  log('error', `فشل بدء الخدمة: ${err.message}`);
  process.exit(1);
});
