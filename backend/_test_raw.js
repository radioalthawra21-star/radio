const net = require('net');
const c = net.connect(3000, '127.0.0.1', () => {
  console.log('connected');
  c.write('GET /api/daily-report/admin/today-summary HTTP/1.0\r\nHost: localhost\r\nAuthorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJ0ZXN0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgzMzI3MTM3LCJleHAiOjE3ODMzMjc0Mzd9.6SgdbZqDonnU5umj42wfgg2dxVBgHqMiUBObBrHjddY\r\n\r\n');
});
c.on('data', d => {
  console.log(d.toString('utf8').substring(0, 1500));
  c.destroy();
});
c.on('error', e => console.error(e.message));
setTimeout(() => { console.log('timeout'); process.exit(0); }, 5000);
