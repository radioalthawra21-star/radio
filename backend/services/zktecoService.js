const axios = require('axios');
const net = require('net');
const BiometricErrorLog = require('../models/BiometricErrorLog');

const LOG_PREFIX = {
  info: 'ℹ️',
  ok: '✅',
  warn: '⚠️',
  error: '❌',
  data: '📊'
};

const logger = {
  log(level, msg, data) {
    const ts = new Date().toLocaleString('ar-SA');
    const prefix = LOG_PREFIX[level] || '•';
    console.log(`${prefix} [${ts}] [ZKService] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
  },
  info: (msg, data) => logger.log('info', msg, data),
  ok: (msg, data) => logger.log('ok', msg, data),
  warn: (msg, data) => logger.log('warn', msg, data),
  error: (msg, data) => logger.log('error', msg, data)
};

class ZKTecoService {
  constructor() {
    this.device = null;
    this.ZKLib = null;
    this.config = null;
    this.connected = false;
    this.lastSync = null;
    this.lastError = null;
    this._connectionAttempts = 0;
    this._maxRetries = 3;
    this._statusHistory = [];
  }

  async loadConfig() {
    if (this.config) return this.config;
    this.config = {
      ip: process.env.ZK_IP || '192.168.1.201',
      port: parseInt(process.env.ZK_PORT || '4370'),
      timeout: parseInt(process.env.ZK_TIMEOUT || '5000'),
      pollInterval: parseInt(process.env.ZK_POLL_INTERVAL || '30000')
    };
    return this.config;
  }

  async ensureLibrary() {
    if (this.ZKLib) return true;
    try {
      this.ZKLib = require('node-zklib');
      return true;
    } catch (err) {
      this.lastError = 'مكتبة node-zklib غير مثبتة. قم بتشغيل: npm install node-zklib';
      logger.error(this.lastError);
      return false;
    }
  }

  async connect() {
    try {
      await this.loadConfig();
      if (!(await this.ensureLibrary())) return false;

      if (this.device && this.connected) {
        return true;
      }

      this._connectionAttempts++;
      this.device = new this.ZKLib(
        this.config.ip,
        this.config.port,
        this.config.timeout,
        5000
      );

      await this.device.createSocket();
      this.connected = true;
      this.lastError = null;
      this._connectionAttempts = 0;
      this._addStatusEvent('connected', `متصل بجهاز ZKTeco على ${this.config.ip}:${this.config.port}`);
      logger.ok(`متصل بجهاز ZKTeco على ${this.config.ip}:${this.config.port}`);
      return true;
    } catch (err) {
      this.connected = false;
      const msg = err?.err?.message || err?.message || 'تعذر الاتصال بجهاز البصمة - تحقق من عنوان IP';
      this.lastError = msg;
      this._addStatusEvent('error', msg);
      logger.error(`فشل الاتصال بالجهاز: ${msg}`);
      return false;
    }
  }

  async disconnect() {
    if (!this.device) return;
    try {
      await this.device.disconnect();
      logger.info('تم فصل الاتصال بالجهاز');
    } catch (err) {
      logger.warn(`خطأ عند فصل الاتصال: ${err.message}`);
    }
    this.device = null;
    this.connected = false;
    this._addStatusEvent('disconnected', 'تم فصل الاتصال بالجهاز');
  }

  _addStatusEvent(status, message) {
    this._statusHistory.unshift({
      status,
      message,
      timestamp: new Date().toISOString()
    });
    if (this._statusHistory.length > 100) {
      this._statusHistory = this._statusHistory.slice(0, 100);
    }
  }

  async getAttendanceRecords() {
    try {
      if (!(await this.connect())) return [];

      const records = await this.device.getAttendances();
      if (!records || !records.data || records.data.length === 0) {
        logger.info('لا توجد سجلات جديدة في الجهاز');
        return [];
      }

      this.lastSync = new Date().toISOString();
      logger.ok(`تم جلب ${records.data.length} سجل من الجهاز`);
      return records.data;
    } catch (err) {
      const msg = err?.err?.message || err?.message || 'خطأ غير معروف';
      logger.error(`فشل جلب سجلات الحضور: ${msg}`);
      this.lastError = msg;
      await this.disconnect();
      return [];
    }
  }

  async getUsers() {
    try {
      if (!(await this.connect())) return [];

      const result = await this.device.getUsers();
      if (!result || !result.data) return [];

      logger.ok(`تم جلب ${result.data.length} مستخدم من الجهاز`);
      return result.data;
    } catch (err) {
      logger.error(`فشل جلب المستخدمين: ${err.message}`);
      return [];
    }
  }

  async getDeviceInfo() {
    try {
      if (!(await this.connect())) return null;

      const info = await this.device.getInfo();
      return info.data || info;
    } catch (err) {
      logger.warn(`لم نتمكن من قراءة معلومات الجهاز: ${err.message}`);
      return null;
    }
  }

  async getAttendanceLogs() {
    return this.getAttendanceRecords();
  }

  async getRealTimeLogs(callback) {
    try {
      if (!(await this.connect())) return;

      await this.device.getRealTimeLogs((data) => {
        if (callback && typeof callback === 'function') {
          callback(data);
        }
      });
      logger.info('بدء استقبال السجلات اللحظية من الجهاز');
    } catch (err) {
      logger.error(`فشل في استقبال السجلات اللحظية: ${err.message}`);
    }
  }

  async testConnection() {
    try {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          message: this.lastError || 'فشل الاتصال بالجهاز',
          config: await this.loadConfig()
        };
      }
      const info = await this.getDeviceInfo();
      await this.disconnect();
      return {
        success: true,
        message: 'تم الاتصال بالجهاز بنجاح',
        config: await this.loadConfig(),
        deviceInfo: info
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
        config: await this.loadConfig()
      };
    }
  }

  async getDeviceStatus() {
    const connected = await this.connect();
    let info = null;
    try {
      if (connected) {
        info = await this.getDeviceInfo();
      }
    } catch (e) {
      // ignore
    }
    if (!connected) {
      await this.disconnect();
    }
    return {
      online: connected,
      connected,
      lastSync: this.lastSync,
      lastError: this.lastError,
      config: this.config ? { ...this.config } : null,
      deviceInfo: info,
      connectionAttempts: this._connectionAttempts,
      timestamp: new Date().toISOString(),
      statusHistory: this._statusHistory.slice(0, 10)
    };
  }

  mapRecord(record) {
    const statusMap = {
      0: 'present',
      1: 'late',
      2: 'absent',
      3: 'overtime'
    };
    return {
      zkUserId: String(record.userId || record.user_id || record.uid || ''),
      deviceUserId: String(record.deviceUserId || ''),
      zkRecordId: record.userSn || record.id || record.recordId || null,
      timestamp: record.timestamp || record.recordTime || record.time || new Date().toISOString(),
      status: record.status !== undefined ? (statusMap[record.status] || 'present') : 'present',
      verifyMode: record.verifyMode || record.verify_mode || 0,
      deviceName: `ZKTeco_${this.config ? this.config.ip : 'unknown'}`,
      raw: record
    };
  }

  async getDeviceFirmware() {
    try {
      const result = {
        firmware: null,
        platform: null,
        serialNumber: null,
        productCode: null,
        deviceName: null,
        macAddress: null
      };

      // 1. Try SDK bridge first (most reliable, via zkemkeeper.dll COM)
      try {
        const sdkData = await this._getFirmwareFromSDKBridge();
        if (sdkData) {
          Object.assign(result, sdkData);
          if (result.firmware || result.serialNumber) return result;
        }
      } catch (e) {
        logger.warn(`SDK Bridge غير متاح لجلب الـ firmware: ${e.message}`);
      }

      // 2. Fallback: node-zklib via executeCmd(CMD_GET_VERSION)
      if (!(await this.connect())) return result;
      try {
        if (this.device && typeof this.device.executeCmd === 'function') {
          const buf = await this.device.executeCmd(1100, '');
          if (buf && buf.length > 0) {
            const str = buf.toString('utf8').replace(/\0+$/, '').trim();
            if (str) {
              result.firmware = str;
              const platformMatch = str.match(/^([A-Za-z0-9_-]+)/);
              if (platformMatch) result.platform = platformMatch[1];
            }
          }
        }
      } catch (e) {
        logger.warn(`CMD_GET_VERSION فشل: ${e.message}`);
      }

      return result;
    } catch (err) {
      logger.warn(`فشل قراءة معلومات الـ Firmware: ${err.message}`);
      return null;
    }
  }

  _getFirmwareFromSDKBridge() {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        resolve(null);
      }, 5000);
      client.connect(3457, '127.0.0.1', () => {
        client.write(JSON.stringify({ cmd: 'get-firmware' }));
      });
      let data = '';
      client.on('data', (chunk) => { data += chunk.toString(); });
      client.on('close', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.status === 'ok' ? parsed.data : null);
        } catch { resolve(null); }
      });
      client.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  getStatus() {
    return {
      connected: this.connected,
      lastSync: this.lastSync,
      lastError: this.lastError,
      config: this.config ? { ...this.config, timeout: undefined } : null,
      timestamp: new Date().toISOString()
    };
  }

  async logError(errorData) {
    try {
      const log = await BiometricErrorLog.create({
        deviceUserId: errorData.deviceUserId || null,
        employee: errorData.employee || null,
        errorType: errorData.errorType || 'unknown',
        errorMessage: errorData.errorMessage || 'خطأ غير معروف',
        rawData: errorData.rawData || null,
        deviceIp: this.config?.ip || null
      });
      logger.warn(`تم تسجيل خطأ بصمة: ${errorData.errorMessage}`);
      return log;
    } catch (err) {
      logger.error(`فشل تسجيل خطأ البصمة: ${err.message}`);
      return null;
    }
  }
}

const zktecoService = new ZKTecoService();

module.exports = zktecoService;
