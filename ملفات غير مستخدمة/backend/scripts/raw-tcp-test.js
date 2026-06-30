const net = require('net');

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

function buildConnectPacket() {
  // Inner data: command=1000(0x03E8), checksum=0, session=0, replyId=0
  const inner = Buffer.alloc(8);
  inner.writeUInt16LE(1000, 0);   // command = CMD_CONNECT
  inner.writeUInt16LE(0, 2);      // checksum placeholder
  inner.writeUInt16LE(0, 4);      // session ID
  inner.writeUInt16LE(0, 6);      // reply ID
  
  // Calculate checksum
  const chksum = createChkSum(inner);
  inner.writeUInt16LE(chksum, 2);
  
  // TCP prefix: 0x50, 0x50, 0x82, 0x7d, length (4 bytes LE)
  const prefix = Buffer.alloc(8);
  prefix[0] = 0x50;
  prefix[1] = 0x50;
  prefix[2] = 0x82;
  prefix[3] = 0x7d;
  prefix.writeUInt16LE(inner.length, 4);  // packet length
  
  return Buffer.concat([prefix, inner]);
}

async function test() {
  console.log('Connecting to', IP, PORT);
  
  const socket = new net.Socket();
  
  socket.once('connect', () => {
    console.log('Connected!');
    const packet = buildConnectPacket();
    console.log('Sending packet (hex):', packet.toString('hex'));
    console.log('Packet length:', packet.length, 'bytes');
    
    let totalReceived = 0;
    let lastActivity = Date.now();
    
    socket.on('data', (data) => {
      totalReceived += data.length;
      lastActivity = Date.now();
      console.log('Received:', data.length, 'bytes');
      console.log('Hex:', data.toString('hex'));
    });
    
    // Send the packet
    socket.write(packet, () => {
      console.log('Packet sent successfully');
    });
    
    // Check every second for activity
    const checkInterval = setInterval(() => {
      console.log(`Waiting... (${Date.now() - lastActivity}ms since last activity, received: ${totalReceived} bytes)`);
      if (Date.now() - lastActivity > 10000) {
        clearInterval(checkInterval);
        console.log('No response for 10 seconds, closing');
        socket.destroy();
        process.exit(0);
      }
    }, 1000);
  });
  
  socket.once('error', (err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
  
  socket.once('close', () => {
    console.log('Socket closed');
    process.exit(0);
  });
  
  socket.setTimeout(15000);
  socket.once('timeout', () => {
    console.error('Socket timeout');
    socket.destroy();
    process.exit(1);
  });
  
  socket.connect(PORT, IP);
}

test();
