const fs = require('fs');
const path = require('path');

const hex = (s) => Buffer.from(s, 'utf8').toString('hex');
const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Written:', filePath);
};

const DEPT = {
  M: hex('المالي'),
  IT: hex('تقنية المعلومات'),
  T: hex('التسويق'),
  AK: hex('الأخبار'),
  E: hex('الإنتاج'),
  LB: hex('البث المباشر'),
  HR: hex('الموارد البشرية'),
  HR2: hex('human resources'),
  HR3: hex('موارد بشرية'),
  MR: hex('المراسلين'),
  TH: hex('التحرير'),
  KH: hex('الخدمات'),
  AL: hex('العلاقات'),
  ITA: hex('الIT'),
};

const d = (h) => Buffer.from(h, 'hex').toString('utf8');

// File 1: dailyReportController.js
const controllerPath = path.join(__dirname, 'controllers', 'dailyReportController.js');
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

// Fix only the corrupted Arabic strings by replacing known garbled patterns
// The file structure is correct, only Arabic strings are corrupted

console.log('Controller file size:', controllerContent.length);

// File 2: DailyReportsDashboard.jsx
const dashboardPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Admin', 'DailyReportsDashboard.jsx');
console.log('Dashboard file exists:', fs.existsSync(dashboardPath));

// File 3: DailyReportDetail.jsx
const detailPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Admin', 'DailyReportDetail.jsx');
console.log('Detail file exists:', fs.existsSync(detailPath));

console.log('\nDEPT map loaded successfully');
console.log('المالي =', d(DEPT.M));
console.log('الموارد البشرية =', d(DEPT.HR));
