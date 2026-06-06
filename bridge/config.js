const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  zk: {
    ip: process.env.ZK_IP || '192.168.1.201',
    port: parseInt(process.env.ZK_PORT || '4370'),
    timeout: parseInt(process.env.ZK_TIMEOUT || '5000'),
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    key: process.env.API_KEY || 'my-secret-key',
  },
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000'),
  syncOnStart: process.env.SYNC_ON_START !== 'false',
};
