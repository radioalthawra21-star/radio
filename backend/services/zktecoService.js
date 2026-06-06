const axios = require('axios');

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

      this.device = new this.ZKLib(
        this.config.ip,
        this.config.port,
        this.config.timeout,
        5000
      );

      await this.device.createSocket();
      this.connected = true;
      this.lastError = null;
      logger.ok(`متصل بجهاز ZKTeco على ${this.config.ip}:${this.config.port}`);
      return true;
    } catch (err) {
      this.connected = false;
      const msg = err?.err?.message || err?.message || 'تعذر الاتصال بجهاز البصمة - تحقق من عنوان IP';
      this.lastError = msg;
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

  mapRecord(record) {
    const statusMap = {
      0: 'present',
      1: 'late',
      2: 'absent',
      3: 'overtime'
    };
    return {
      zkUserId: String(record.userId || record.user_id || record.uid || ''),
      zkRecordId: record.id || record.recordId || null,
      timestamp: record.timestamp || record.recordTime || record.time || new Date().toISOString(),
      status: record.status !== undefined ? (statusMap[record.status] || 'present') : 'present',
      verifyMode: record.verifyMode || record.verify_mode || 0,
      deviceName: `ZKTeco_${this.config ? this.config.ip : 'unknown'}`,
      raw: record
    };
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
}

const zktecoService = new ZKTecoService();

module.exports = zktecoService;
