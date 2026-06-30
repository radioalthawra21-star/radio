const ZKLib = require('node-zklib');

async function main() {
  const ip = process.env.ZK_IP || '192.168.15.50';
  const port = parseInt(process.env.ZK_PORT || '4370');
  
  console.log(`Connecting to ${ip}:${port}...`);
  const device = new ZKLib(ip, port, 5000, 5000);
  
  try {
    await device.createSocket();
    console.log('Connected!');
    
    const info = await device.getInfo();
    console.log('Device info:', JSON.stringify(info.data || info, null, 2));
    
    const users = await device.getUsers();
    console.log(`Users: ${users.data ? users.data.length : 0}`);
    
    const att = await device.getAttendances();
    if (att && att.data) {
      console.log(`Attendance records: ${att.data.length}`);
      const dates = att.data.map(r => r.timestamp || r.recordTime || r.time).filter(Boolean);
      const uniqueDates = [...new Set(dates.map(d => new Date(d).toISOString().split('T')[0]))].sort();
      console.log(`Unique dates (${uniqueDates.length}):`, uniqueDates.slice(-10));
      console.log('First 3 records:', JSON.stringify(att.data.slice(0, 3), null, 2));
      console.log('Last 3 records:', JSON.stringify(att.data.slice(-3), null, 2));
    } else {
      console.log('No attendance records or error');
    }
    
    await device.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Full:', err.err?.message || err);
  }
}

main().catch(console.error);
