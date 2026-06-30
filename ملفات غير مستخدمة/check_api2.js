const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function httpReq(opts, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data, status: res.statusCode }); }
      });
    });
    req.setTimeout(timeoutMs || 15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Login
  const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });
  console.log('Logging in...');
  const login = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, loginData, 10000);

  if (!login.success) { console.log('Login failed:', JSON.stringify(login)); return; }
  const token = login.data.token;
  console.log('Logged in');

  // Call recent activity
  console.log('\nFetching recent activity...');
  const activity = await httpReq({
    hostname: 'localhost', port: 3000, path: '/api/zkteco/recent-activity', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  }, null, 20000);
  console.log('Recent Activity - success:', activity.success, 'count:', activity.count);
  if (activity.data) {
    console.log('Data length:', activity.data.length);
    activity.data.slice(0, 3).forEach((r, i) => {
      console.log(`${i+1}. ${r.employeeName} | ${r.employeeDepartment} | status: ${r.status} | in: ${r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '-'} | out: ${r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '-'}`);
    });
    if (activity.data.length > 3) console.log(`... and ${activity.data.length - 3} more`);
  }
}

main().catch(err => console.error('Error:', err.message));
