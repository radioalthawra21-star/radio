## ZKTeco Biometric Sync System

### Architecture
- **Backend**: Express.js server (PID 8564, `backend/server.js`)
- **Bridge**: ZKTeco bridge service (PID not running/6792, `bridge/index.js`)
- **Database**: MongoDB Atlas `mongodb+srv://radios:radios123@radio.j0lovmb.mongodb.net/test`
- **Device**: ZKTeco biometric reader at 192.168.15.50:4370
- **Library**: node-zklib@1.3.0 (in both `backend/` and `bridge/`)

### Device Connection
- ZK_IP=192.168.15.50, ZK_PORT=4370
- Connection timeout: 10s, polling interval: 5000ms
- Device stores time as packed 32-bit integer (seconds since ~2000)
- `parseTimeToDate()` in `node-zklib/utils.js` decodes to JS Date (local timezone = Saudi UTC+3)
- Device user names may appear garbled (Arabic encoding issue)

### Database Models

#### Attendance (`backend/models/Attendance.js`)
- `employee` (ObjectId → User) — **required**
- `date` (Date) — **required**
- `checkIn.time`, `checkIn.status`, `checkIn.location`, `checkIn.notes`
- `checkOut.time`, `checkOut.status`, `checkOut.location`, `checkOut.notes`
- `duration`, `expectedHours` (default 8), `overtime`
- `status` (present/absent/late/half_day/on_leave/work_from_home)
- `deviceUserId` (String, for unmapped records — but `employee` is required, so this can only be used when employee is also set)
- `deviceUserName` (String)
- Unique index: `{ employee: 1, date: -1 }`

#### User (`backend/models/User.js`)
- `zkUserId` (String, sparse: true) — links system user to device user ID

### Key API Endpoints
- `GET /api/zkteco/recent-activity` — shows today's activity (uses `getDayRange()` which is local-timezone-based: setHours(0,0,0,0) to next day)
- `POST /api/zkteco/bulk-map-users` — maps device users to system users
- `POST /api/zkteco/sync` — triggers sync via bridge

### Known Mappings (System User ← Device ID)
- يامن البيوش (yamen@radio.com, production) ← `zkUserId: 1001`
- عمار البيوش (ammar@radio.com, news) ← `zkUserId: 1003`
- المالي (mali@radio.com, المالية) ← `zkUserId: 1005`
- محمد طرشة (tarsha@radio.com, marketing) ← `zkUserId: 1008`
- ابو السعد (saad@radio.com, marketing) ← `zkUserId: 1010`
- حمادة سميسم (hamada@radio.com, الIT) ← `zkUserId: 1016`

### System Users WITHOUT zkUserId (awaiting mapping)
1. صهيب (sohaib@radio.com, production)
2. موظف it (m1@radio.com, الIT)
3. n (n@radio.com, news)
4. ma (ma@radio.com, المالية)
5. mawa (mawa@radio.com, الموارد البشرية)
6. عبد الله (hr@radio.com, human resources)
7. مصطفى الخشن (mostafa@radio.com, الموارد البشرية)
8. Mohamad (mohamad@radio.com, financial)

### Device IDs NOT mapped (24 target IDs from user)
1001✓, 1002, 1003✓, 1004, 1005✓, 1006, 1007, 1008✓, 1009, 1010✓, 1011, 1012, 1014, 1015, 1016✓, 1017, 1018, 1019, 1020, 1029, 1031, 1036, 1046, 1052

### Sync Process
1. Connect to device via `ZKLib(IP, PORT)`
2. Call `device.getAttendances()` to get all records
3. Filter by target IDs AND today's date (local Saudi timezone)
4. For each record:
   - Find system user by `zkUserId` matching `deviceUserId`
   - Create Attendance record with `employee` (ObjectId), `date` (from device recordTime), `checkIn.time`
   - If multiple records same user+day: first = checkIn, last = checkOut
5. `getRecentBiometricActivity` queries Attendance between local todayStart and todayEnd

### Known Issues
- **Timezone**: Device stores time as local Saudi (UTC+3). `parseTimeToDate()` creates Date in local timezone, which is correct when server is in UTC+3.
- **`employee` required**: Cannot create Attendance without valid User reference. All device users must first be mapped via `zkUserId`.
- **Arabic names garbled**: Device uses encoding that doesn't display Arabic correctly in node-zklib output.
- **Full sync slow**: 44,862 records — use targeted sync (`sync-targeted-today.js` or `smart-sync-today.js`) instead of `force-sync-all.js`.

### Scripts in `backend/scripts/`
- `sync-targeted-today.js` — sync today's records for specific target IDs
- `smart-sync-today.js` — deletes old records then re-syncs today for target IDs
- `force-sync-all.js` — full sync of all records (slow)
- `dump-raw-attendance.js` — diagnostic dump of all device records
- `list-users.js` — shows system users and device users side by side
