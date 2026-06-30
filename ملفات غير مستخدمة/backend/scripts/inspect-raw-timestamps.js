const ZKLib = require('node-zklib');

const DEVICE_IP = process.env.ZK_IP || '192.168.15.50';
const DEVICE_PORT = parseInt(process.env.ZK_PORT || '4370');

(async () => {
  const device = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 5000);
  await device.createSocket();
  console.log('Connected.');

  const attendanceResult = await device.getAttendances();
  const records = attendanceResult.data || [];
  console.log(`Total records: ${records.length}`);
  
  // Show raw first 3 records
  console.log('\nRaw first 3 records from device:');
  for (let i = 0; i < Math.min(3, records.length); i++) {
    const r = records[i];
    console.log(`\nRecord ${i}:`);
    console.log(`  Object keys: ${Object.keys(r).join(', ')}`);
    console.log(`  Full raw: ${JSON.stringify(r, null, 2)}`);
    
    // Check the timestamp field
    const ts = r.timestamp || r.recordTime || r.time;
    console.log(`  timestamp value: "${ts}" (${typeof ts})`);
    if (ts) {
      const d = new Date(ts);
      console.log(`  parsed as Date: ${d}`);
      console.log(`  toISOString(): ${d.toISOString()}`);
      console.log(`  ISO date: ${d.toISOString().split('T')[0]}`);
      console.log(`  getTime(): ${d.getTime()}`);
      console.log(`  getTimezoneOffset(): ${d.getTimezoneOffset()}`);
    }
  }
  
  // Find records that look like today
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  console.log(`\n\nToday (server): ${todayStr} = ${now.toISOString()}`);
  
  const todayRecords = records.filter(r => {
    const ts = r.timestamp || r.recordTime || r.time;
    if (!ts) return false;
    const d = new Date(ts);
    return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === todayStr;
  });
  
  console.log(`Records with date ${todayStr}: ${todayRecords.length}`);
  
  if (todayRecords.length > 0) {
    console.log('\nToday records (first 5):');
    todayRecords.slice(0, 5).forEach(r => {
      const ts = r.timestamp || r.recordTime || r.time;
      const uid = r.deviceUserId || r.userId || r.user_id || r.uid;
      const d = new Date(ts);
      console.log(`  userId: ${uid}, timestamp: "${ts}", parsed: ${d.toISOString()}, local: ${d.toString()}`);
    });
  }
  
  await device.disconnect();
  console.log('\nDone');
})();
