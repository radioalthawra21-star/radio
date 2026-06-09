const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function httpReq(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Login
  const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
  const login = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, loginData);

  if (!login.success) { console.log('Login failed:', JSON.stringify(login)); return; }
  const token = login.data.token;
  console.log('Logged in, token:', token.substring(0, 30) + '...');

  // Call recent activity
  const activity = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/zkteco/recent-activity', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('\nRecent Activity - success:', activity.success, 'count:', activity.count);
  if (activity.data && activity.data.length > 0) {
    activity.data.slice(0, 5).forEach((r, i) => {
      console.log(`${i+1}. ${r.employeeName} | ${r.employeeDepartment} | status: ${r.status} | in: ${r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '-'} | out: ${r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '-'} | mapped: ${r.isMapped}`);
    });
    console.log(`... and ${activity.data.length - 5} more`);
  }

  // Call dashboard stats
  const stats = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/zkteco/dashboard-stats', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('\nDashboard stats:', JSON.stringify(stats.data, null, 2));

  // Call today attendance API
  const todayAtt = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/attendance/today', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('\nToday attendance - success:', todayAtt.success, 'count:', todayAtt.count);
  if (todayAtt.data && todayAtt.data.length > 0) {
    todayAtt.data.slice(0, 3).forEach(r => {
      console.log(`  ${r.employee?.name || r.employeeName || '?'} | ${r.status} | in: ${r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : '-'} | out: ${r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : '-'}`);
    });
  }
}

main().catch(console.error);
