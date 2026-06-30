/**
 * End-to-end test to reproduce admin 403 issue
 * - Starts server
 * - Logs in as admin
 * - Attempts to update a department
 * - Captures server debug logs
 */

const { spawn } = require('child_process');
const http = require('http');
const { StringDecoder } = require('string_decoder');

const SERVER_URL = 'http://localhost:3000';
let serverProcess;
let logs = [];

// Helper to log with prefix
function log(msg) {
  console.log(msg);
  logs.push(msg);
}

// Collect server output
function handleServerOutput(data) {
  const text = data.toString();
  process.stdout.write(text); // forward to console
  logs.push(text.trim());
}

function waitForServer(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(SERVER_URL + '/api/health', (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      }).on('error', (err) => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('🚀 Starting server...\n');
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  serverProcess.stdout.on('data', handleServerOutput);
  serverProcess.stderr.on('data', handleServerOutput);

  try {
    log('⏳ Waiting for server to be ready...');
    await waitForServer(15000);
    log('✅ Server is up!\n');

    // Step 1: Login as admin
    log('🔐 Logging in as admin...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    log(`Login status: ${loginRes.status}`);
    if (loginRes.status !== 200) {
      log('Login failed! Response: ' + JSON.stringify(loginRes.body));
      throw new Error('Login failed');
    }
    const token = loginRes.body.data.token;
    log(`✅ Token obtained: ${token.substring(0, 20)}...\n`);

    // Step 2: Get departments
    log('📋 Fetching departments...');
    const deptRes = await makeRequest('GET', '/api/departments', null, token);
    log(`Departments status: ${deptRes.status}`);
    if (deptRes.status !== 200 || !deptRes.body.data.departments.length) {
      log('No departments found!');
      throw new Error('No departments');
    }
    const department = deptRes.body.data.departments[0];
    log(`Using department: ${department.name} (${department._id})\n`);

    // Step 3: Attempt update department
    log('🔧 Attempting to update department...');
    const updateRes = await makeRequest('PUT', `/api/departments/${department._id}`, {
      name: department.name, // same name, essentially no-op
      color: department.color,
    }, token);
    log(`\n📨 Update response status: ${updateRes.status}`);
    log('Response body: ' + JSON.stringify(updateRes.body, null, 2));

    // Analyze result
    if (updateRes.status === 403) {
      log('\n❌ 403 Forbidden received. This confirms the bug.');
      log('🔎 Check server logs above for role/debug info:');
      log('   Look for "🔍 AUTH DEBUG:" lines showing decoded.id, user._id, user.role, etc.');
    } else if (updateRes.status === 200) {
      log('\n✅ Update succeeded! No 403 issue.');
    } else {
      log(`\n⚠️ Unexpected status: ${updateRes.status}`);
    }

  } catch (err) {
    log(`\n❌ Error: ${err.message}`);
    console.error(err);
  } finally {
    // Cleanup
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      log('\n🛑 Server stopped.');
    }
  }
}

main();
