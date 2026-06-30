const ZKLib = require('node-zklib');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ip = process.env.ZK_IP || '192.168.15.50';
const port = parseInt(process.env.ZK_PORT || '4370');

async function main() {
  console.log(`Trying connection to ${ip}:${port}`);
  
  // Try UDP directly
  const ZKLibUDP = require('./../node_modules/node-zklib/zklibudp');
  const udp = new ZKLibUDP(ip, port, 5000, 5000);
  
  try {
    console.log('\n--- Trying UDP ---');
    await udp.createSocket();
    console.log('UDP socket created');
    await udp.connect();
    console.log('UDP connected!');
    
    console.log('Getting info...');
    const info = await udp.getInfo();
    console.log('Info:', JSON.stringify(info, null, 2));
    
    console.log('Getting users...');
    const users = await udp.getUsers();
    console.log(`Users: ${users.data ? users.data.length : 0}`);
    
    console.log('Getting attendance...');
    const att = await udp.getAttendances();
    console.log(`Attendance records: ${att.data ? att.data.length : 0}`);
    
    await udp.disconnect();
    console.log('\nUDP done!');
    return;
  } catch (err) {
    console.error('UDP failed:', err.message);
    console.error('Full:', err);
  }
  
  await udp.disconnect();
  
  // Try with the main ZKLib but modify timeout
  console.log('\n--- Trying ZKLib with different timeout ---');
  const device = new ZKLib(ip, port, 10000, 5000);
  try {
    await device.createSocket();
    console.log('Connected!');
    
    const info = await device.getInfo();
    console.log('Info:', JSON.stringify(info, null, 2));
    
    const users = await device.getUsers();
    console.log(`Users: ${users.data ? users.data.length : 0}`);
    
    const att = await device.getAttendances();
    console.log(`Attendance: ${att.data ? att.data.length : 0}`);
    
    await device.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('ZKLib failed:', err.message);
    console.error('Full:', err.err?.message || err);
  }
  
  await device.disconnect().catch(() => {});
}

main().catch(console.error);
