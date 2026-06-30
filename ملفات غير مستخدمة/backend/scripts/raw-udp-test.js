const dgram = require('dgram');

const IP = '192.168.15.50';
const PORT = 4370;

function createChkSum(buf) {
  let chksum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i + 1 < buf.length) {
      chksum += buf.readUInt16LE(i);
    } else {
      chksum += buf[i];
    }
  }
  return chksum & 0xFFFF;
}

function buildUDPConnectPacket() {
  // UDP packet: command(2) + checksum(2) + session(2) + replyId(2) = 8 bytes
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(1000, 0);   // command = CMD_CONNECT
  buf.writeUInt16LE(0, 2);      // checksum placeholder
  buf.writeUInt16LE(0, 4);      // session ID = 0
  buf.writeUInt16LE(0, 6);      // reply ID = 0
  
  const chksum = createChkSum(buf);
  buf.writeUInt16LE(chksum, 2);
  
  return buf;
}

async function test() {
  console.log('Trying UDP ZK protocol to', IP, PORT);
  
  const socket = dgram.createSocket('udp4');
  
  socket.once('error', (err) => {
    console.error('UDP error:', err.message);
  });
  
  socket.on('message', (msg, rinfo) => {
    console.log('Received response:', msg.length, 'bytes from', rinfo.address);
    console.log('Hex:', msg.toString('hex'));
    
    // Try to parse
    if (msg.length >= 8) {
      const cmd = msg.readUInt16LE(0);
      const chk = msg.readUInt16LE(2);
      const ses = msg.readUInt16LE(4);
      const rep = msg.readUInt16LE(6);
      console.log(`  Command: ${cmd}, Checksum: ${chk}, Session: ${ses}, Reply: ${rep}`);
    }
  });
  
  socket.once('listening', () => {
    console.log('Socket bound');
    
    const packet = buildUDPConnectPacket();
    console.log('Sending UDP packet (hex):', packet.toString('hex'));
    
    socket.send(packet, 0, packet.length, PORT, IP, (err) => {
      if (err) console.error('Send error:', err.message);
      else console.log('Packet sent, waiting for response...');
    });
  });
  
  socket.bind(0); // random port
  
  // Wait up to 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('Test complete, closing socket');
  socket.close();
}

test().catch(console.error);
