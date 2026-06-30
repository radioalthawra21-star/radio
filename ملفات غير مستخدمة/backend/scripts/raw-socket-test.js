const net = require('net');
const dgram = require('dgram');

const IP = '192.168.15.50';
const PORT = 4370;

async function testTCP() {
  console.log('=== TCP Test ===');
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.once('connect', () => {
      console.log('TCP connected!');
      
      // ZK CMD_CONNECT packet (command 1000 = 0x03E8)
      // Standard ZK packet: 16 byte header + data
      // Header: 4 bytes magic + 2 bytes packet length + 2 bytes command + 2 bytes session + 4 bytes reply
      const buf = Buffer.alloc(16);
      buf.writeUInt16LE(0, 0);      // magic?
      
      // Try the standard ZK connect packet
      buf.writeUInt16LE(1000, 4);   // command = CMD_CONNECT
      buf.writeUInt16LE(0, 2);      // length placeholder
      buf.writeUInt16LE(0, 6);      // session ID
      buf.writeUInt16LE(0, 8);      // reply ID
      
      console.log('Sending CMD_CONNECT...');
      console.log('Packet (hex):', buf.toString('hex'));
      
      socket.write(buf);
      
      // Wait for response
      let responseData = Buffer.alloc(0);
      socket.on('data', (data) => {
        console.log('Received data:', data.length, 'bytes');
        console.log('Hex:', data.toString('hex'));
        responseData = Buffer.concat([responseData, data]);
      });
      
      setTimeout(() => {
        console.log('Total received:', responseData.length, 'bytes');
        socket.destroy();
        resolve();
      }, 5000);
    });
    
    socket.once('error', (err) => {
      console.error('TCP error:', err.message);
      socket.destroy();
      resolve();
    });
    
    socket.once('timeout', () => {
      console.error('TCP timeout');
      socket.destroy();
      resolve();
    });
    
    socket.connect(PORT, IP);
  });
}

async function testUDP() {
  console.log('\n=== UDP Test ===');
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    
    socket.once('error', (err) => {
      console.error('UDP error:', err.message);
      socket.close();
      resolve();
    });
    
    socket.once('message', (msg) => {
      console.log('UDP received:', msg.length, 'bytes');
      console.log('Hex:', msg.toString('hex'));
    });
    
    socket.once('listening', () => {
      console.log('UDP socket listening');
      
      // Send CMD_CONNECT via UDP
      const buf = Buffer.alloc(8);
      buf.writeUInt16LE(1000, 4);   // command = CMD_CONNECT
      buf.writeUInt16LE(0, 6);      // session ID
      buf.writeUInt16LE(0, 2);      // length
      
      socket.send(buf, 0, buf.length, PORT, IP, (err) => {
        if (err) console.error('UDP send error:', err.message);
        else console.log('UDP message sent');
      });
    });
    
    socket.bind(5001);
    
    setTimeout(() => {
      console.log('UDP test done');
      socket.close();
      resolve();
    }, 5000);
  });
}

async function testWeb() {
  console.log('\n=== HTTP Test ===');
  const http = require('http');
  const urls = [
    'http://192.168.15.50/',
    'http://192.168.15.50:8080/',
    'http://192.168.15.50:80/',
    'http://192.168.15.50/deviceinfo'
  ];
  
  for (const url of urls) {
    try {
      await new Promise((resolve) => {
        const req = http.get(url, { timeout: 2000 }, (res) => {
          console.log(`${url} -> HTTP ${res.statusCode}`);
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (data.length < 500) console.log(`  Response: ${data.substring(0, 200)}`);
            resolve();
          });
        });
        req.on('error', (err) => {
          console.log(`${url} -> Error: ${err.message}`);
          resolve();
        });
        req.on('timeout', () => {
          req.destroy();
          console.log(`${url} -> Timeout`);
          resolve();
        });
      });
    } catch (e) {
      console.log(`${url} -> ${e.message}`);
    }
  }
}

(async () => {
  await testTCP();
  await testUDP();
  await testWeb();
  console.log('\nAll tests complete');
})();
