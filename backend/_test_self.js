const { spawn } = require('child_process');
const http = require('http');
const jwt = require('jsonwebtoken');

const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', d => { output += d.toString(); });
server.stderr.on('data', d => { output += d.toString(); });

let token = '';
async function init() {
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/test');
  const admin = await mongoose.connection.db.collection('users').findOne({ role: 'admin' });
  if (admin) {
    token = jwt.sign({ id: admin._id.toString(), role: admin.role }, 'your_jwt_secret_key_change_this', { expiresIn: '1h' });
    console.log('Token for:', admin.email, admin.role);
  }
  await mongoose.disconnect();
}

function makeRequest() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/api/daily-report/admin/today-summary',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const req = http.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function waitAndTest() {
  await init();
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const result = await makeRequest();
      console.log('SUCCESS! Status:', result.status);
      console.log('Body:', result.body.substring(0, 3000));
      server.kill();
      process.exit(0);
    } catch (e) {
      console.log(`Attempt ${i + 1}: ${e.message}`);
    }
  }
  console.log('FAILED - no response');
  console.log('Server output:', output);
  server.kill();
  process.exit(1);
}

waitAndTest();
