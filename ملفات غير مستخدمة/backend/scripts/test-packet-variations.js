const net = require('net');

const IP = '192.168.15.50';
const PORT = 4370;

// Try all variations of connect packet
const variations = [];

// Variation 1: Standard TCP header (with 0x50 0x50 prefix), checksum=0
let inner = Buffer.alloc(8);
inner.writeUInt16LE(1000, 0);  // command
inner.writeUInt16LE(0, 2);     // checksum = 0
inner.writeUInt16LE(0, 4);     // session
inner.writeUInt16LE(0, 6);     // replyId
let prefix = Buffer.from([0x50, 0x50, 0x82, 0x7d, 0x08, 0x00, 0x00, 0x00]);
variations.push({ name: 'Standard 0x50 prefix, checksum=0', packet: Buffer.concat([prefix, inner]) });

// Variation 2: Standard TCP header, checksum computed
inner = Buffer.alloc(8);
inner.writeUInt16LE(1000, 0);
inner.writeUInt16LE(0, 2);
inner.writeUInt16LE(0, 4);
inner.writeUInt16LE(0, 6);
let chk = 0;
for (let i = 0; i < inner.length; i += 2) {
  chk += inner.readUInt16LE(i);
}
chk = chk & 0xFFFF;
inner.writeUInt16LE(chk, 2);
variations.push({ name: 'Standard 0x50 prefix, checksum=' + chk, packet: Buffer.concat([prefix, inner]) });

// Variation 3: No prefix, just 8 bytes
inner = Buffer.alloc(8);
inner.writeUInt16LE(1000, 0);
inner.writeUInt16LE(0, 2);
inner.writeUInt16LE(0, 4);
inner.writeUInt16LE(0, 6);
chk = 0;
for (let i = 0; i < inner.length; i += 2) {
  chk += inner.readUInt16LE(i);
}
inner.writeUInt16LE(chk & 0xFFFF, 2);
variations.push({ name: 'No prefix, checksum=' + (chk & 0xFFFF), packet: inner });

// Variation 4: Empty connect packet
variations.push({ name: 'Empty (just header)', packet: prefix });

// Variation 5: UDP style (no prefix, checksum=0)
inner = Buffer.alloc(8);
inner.writeUInt16LE(1000, 0);
inner.writeUInt16LE(0, 2);
inner.writeUInt16LE(0, 4);
inner.writeUInt16LE(0, 6);
variations.push({ name: 'UDP style no prefix checksum=0', packet: inner });

async function tryVariation(varObj) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let responded = false;
    
    socket.setTimeout(3000);
    
    socket.once('connect', () => {
      let received = Buffer.alloc(0);
      
      socket.on('data', (data) => {
        responded = true;
        received = Buffer.concat([received, data]);
      });
      
      socket.write(varObj.packet, () => {});
      
      setTimeout(() => {
        socket.destroy();
        if (responded) {
          console.log(`✓ ${varObj.name}: GOT RESPONSE! (${received.length} bytes)`);
          console.log(`  Hex: ${received.toString('hex')}`);
          resolve(true);
        } else {
          console.log(`✗ ${varObj.name}: No response`);
          resolve(false);
        }
      }, 2500);
    });
    
    socket.once('error', (err) => {
      socket.destroy();
      console.log(`✗ ${varObj.name}: Error - ${err.message}`);
      resolve(false);
    });
    
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(PORT, IP);
  });
}

async function main() {
  console.log(`Testing ${variations.length} packet variations...\n`);
  
  for (const v of variations) {
    await tryVariation(v);
    // Small delay between attempts
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\nDone');
}

main().catch(console.error);
