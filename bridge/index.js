const ZKLib = require('node-zklib');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const config = require('./config');

let device = null;
let lastSyncTime = null;
let knownUsers = [];
let syncInterval = null;
let syncedRecordIds = new Set();
let sdkProcess = null;
let sdkAvailable = false;
const SYNCED_IDS_FILE = path.join(__dirname, 'synced_ids.json');
const SDK_PORT = 3457;
const SDK_SCRIPT = path.join(__dirname, '..', 'SDK', 'SDKBridge', 'SDKBridge.ps1');
const PS_32 = `${process.env.SystemRoot || 'C:\\Windows'}\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe`;

function log(level, msg, data) {
  const ts = new Date().toLocaleString('ar-SA');
  const prefix = { info: 'ℹ️', ok: '✅', warn: '⚠️', error: '❌', data: '📊' }[level] || '•';
  console.log(`${prefix} [${ts}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

// ---- SDK Bridge communication (32-bit PowerShell COM wrapper) ----

async function sdkSend(cmd) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let timeout = setTimeout(() => {
      client.destroy();
      resolve(null);
    }, 15000);
    client.connect(SDK_PORT, '127.0.0.1', () => {
      client.write(JSON.stringify(cmd));
    });
    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });
    client.on('close', () => {
      clearTimeout(timeout);
      try { resolve(JSON.parse(data)); } catch { resolve(null); }
    });
    client.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

async function sdkConnect() {
  const res = await sdkSend({ cmd: 'ping' });
  if (res && res.status === 'ok') {
    sdkAvailable = true;
    return true;
  }
  sdkAvailable = false;
  return false;
}

async function startSdkBridge() {
  if (sdkAvailable) return true;
  if (!fs.existsSync(PS_32)) {
    log('warn', '❌ 32-bit PowerShell غير موجود. سيتم استخدام node-zklib فقط.');
    return false;
  }
  if (!fs.existsSync(SDK_SCRIPT)) {
    log('warn', `❌ ملف SDKBridge غير موجود: ${SDK_SCRIPT}`);
    return false;
  }
  try {
    sdkProcess = spawn(PS_32, [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', SDK_SCRIPT, String(SDK_PORT)
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    sdkProcess.stdout.on('data', (d) => {
      const lines = d.toString().trim().split('\n').filter(Boolean);
      for (const l of lines) log('info', `[SDK] ${l}`);
    });
    sdkProcess.stderr.on('data', (d) => {
      const lines = d.toString().trim().split('\n').filter(Boolean);
      for (const l of lines) log('error', `[SDK] ${l}`);
    });
    sdkProcess.on('exit', (code) => {
      log('warn', `⚠️  SDK Bridge توقف (رمز: ${code}). سيتم إعادة التشغيل تلقائياً.`);
      sdkAvailable = false;
      sdkProcess = null;
      setTimeout(startSdkBridge, 5000);
    });
    log('info', '🚀 جاري تشغيل SDK Bridge (32-bit PowerShell COM)...');
    await new Promise(r => setTimeout(r, 3000));
    const ok = await sdkConnect();
    if (ok) {
      log('ok', '✅ SDK Bridge جاهز (COM: zkemkeeper.ZKEM)');
      const conn = await sdkSend({ cmd: 'connect', params: { ip: config.zk.ip, port: config.zk.port } });
      if (conn && conn.status === 'ok') {
        log('ok', `✅ متصل بالجهاز عبر SDK: ${config.zk.ip}:${config.zk.port}`);
        return true;
      }
      log('warn', `⚠️  SDK Bridge متصل لكن فشل الاتصال بالجهاز.`);
      return false;
    }
    log('warn', '⚠️  SDK Bridge لم يستجب. سيتم استخدام node-zklib.');
    return false;
  } catch (err) {
    log('error', `❌ فشل تشغيل SDK Bridge: ${err.message}`);
    return false;
  }
}

function stopSdkBridge() {
  if (sdkProcess) {
    try { sdkProcess.kill(); } catch {}
    sdkProcess = null;
  }
  sdkAvailable = false;
}

// ---- Standard ZKLib device communication (fallback) ----

function cleanupSocket() {
  if (device && device.socket) {
    try {
      device.socket.removeAllListeners('close');
      device.socket.removeAllListeners('data');
      device.socket.removeAllListeners('error');
      device.socket.removeAllListeners('connect');
    } catch (e) { }
  }
}

async function connectDevice() {
  if (device) {
    cleanupSocket();
    try { await device.disconnect(); } catch (e) { }
    device = null;
  }
  device = new ZKLib(config.zk.ip, config.zk.port, config.zk.timeout, 5000);
  if (device.socket) device.socket.setMaxListeners(20);
  try {
    await device.createSocket();
    if (device.socket) device.socket.setMaxListeners(20);
    log('ok', `🔄 متصل بجهاز ZKTeco عبر node-zklib على ${config.zk.ip}:${config.zk.port}`);
    return true;
  } catch (err) {
    const errMsg = err.err?.message || err.message || err;
    log('error', `فشل الاتصال بالجهاز عبر node-zklib: ${errMsg}`);
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

async function sdkFetchAllAttendance() {
  if (!sdkAvailable) return [];
  const res = await sdkSend({ cmd: 'get-all-attendance' });
  if (res && res.status === 'ok' && res.records) {
    log('ok', `📊 SDK: ${res.count} سجل (جميع السجلات من الجهاز)`);
    return res.records;
  }
  log('warn', '⚠️ SDK فشل في جلب جميع السجلات');
  return [];
}

async function fetchUsers() {
  if (sdkAvailable) {
    const res = await sdkSend({ cmd: 'get-users' });
    if (res && res.status === 'ok' && res.users) {
      knownUsers = res.users;
      log('ok', `📊 SDK: ${res.count} مستخدم من الجهاز`);
      return knownUsers;
    }
  }
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
  const statusMap = { 0: 'present', 1: 'late' };
  const rawUserId = record.deviceUserId || record.userId || record.user_id || record.uid || '';
  const rawTimestamp = record.timestamp || record.recordTime || record.time || '';
  return {
    zkUserId: rawUserId,
    deviceUserId: rawUserId,
    zkRecordId: `${rawUserId}_${rawTimestamp}`,
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
        headers: { 'Content-Type': 'application/json', 'x-bridge-key': config.api.key },
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
      if (Array.isArray(data)) syncedRecordIds = new Set(data);
      log('info', `تم تحميل ${syncedRecordIds.size} معرف مزامن من الملف`);
    }
  } catch (err) {
    log('warn', `لم نتمكن من تحميل المعرفات المزامنة: ${err.message}`);
  }
}

function saveSyncedIds() {
  try {
    const arr = Array.from(syncedRecordIds);
    fs.writeFileSync(SYNCED_IDS_FILE, JSON.stringify(arr.length > 100000 ? arr.slice(-50000) : arr));
  } catch (err) {
    log('warn', `لم نتمكن من حفظ المعرفات المزامنة: ${err.message}`);
  }
}

async function syncDeviceInfo() {
  if (sdkAvailable) {
    const res = await sdkSend({ cmd: 'info' });
    if (res && res.status === 'ok' && res.data) {
      log('data', `📊 SDK: ${JSON.stringify(res.data)}`);
      return;
    }
  }
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

  // Start SDK Bridge (32-bit PowerShell COM wrapper) if available
  const sdkOk = await startSdkBridge();
  if (sdkOk) {
    log('ok', '✅ SDK Bridge يعمل - سيتم استخدام zkemkeeper.dll الرسمي');
    await syncAttendance();
  } else {
    log('warn', '⚠️ SDK Bridge غير متاح - التبديل إلى node-zklib');
    const connected = await connectDevice();
    if (connected) {
      await syncDeviceInfo();
      await fetchUsers();
      if (config.syncOnStart) {
        log('info', 'مزامنة أولية...');
        await syncAttendance();
      }
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
  stopSdkBridge();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch(err => {
  log('error', `فشل بدء الخدمة: ${err.message}`);
  process.exit(1);
});
