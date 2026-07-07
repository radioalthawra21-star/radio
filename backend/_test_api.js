const http = require('http');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJ0ZXN0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgzMzI3MTM3LCJleHAiOjE3ODMzMjc0Mzd9.6SgdbZqDonnU5umj42wfgg2dxVBgHqMiUBObBrHjddY';

function test(path) {
  const opts = {
    hostname: 'localhost', port: 3000,
    path: path, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  const req = http.request(opts, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`${path}: Status ${res.statusCode}`);
      console.log(data.substring(0, 800));
      console.log('---');
    });
  });
  req.on('error', e => console.error(`${path}: Error: ${e.message}`));
  req.end();
}

setTimeout(() => test('/api/daily-report/admin/today-summary'), 1000);
setTimeout(() => test('/api/daily-report/admin/today-summary'), 2000);
setTimeout(() => { process.exit(0); }, 5000);
