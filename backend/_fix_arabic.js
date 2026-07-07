const fs = require('fs');
const path = require('path');

const hex = s => Buffer.from(s, 'utf8').toString('hex');

const AR = {
  // Department names
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
  GM: hex('غير محدد'),
  // Error messages
  ERR_MANAGER: hex('خطأ في جلب المدير المباشر'),
  ERR_STATUS: hex('خطأ في التحقق من حالة التقرير'),
  ERR_TODAY: hex('خطأ في جلب التقرير'),
  ERR_SUBMIT_DUP: hex('لقد قمت بتعبئة التقرير اليومي مسبقاً'),
  ERR_SUBMIT: hex('خطأ في حفظ التقرير'),
  SUCCESS_MSG: hex('تم حفظ التقرير اليومي بنجاح ✓'),
  ERR_ADMIN: hex('خطأ في جلب إحصائيات التقارير'),
  ERR_REPORT: hex('التقرير غير موجود'),
  ERR_FETCH: hex('خطأ في جلب التقرير'),
  ERR_FETCH_ALL: hex('خطأ في جلب التقارير'),
  ERR_SUBMIT_ALT: hex('حدث خطأ في حفظ التقرير'),
  // Day names
  D0: hex('الأحد'),
  D1: hex('الإثنين'),
  D2: hex('الثلاثاء'),
  D3: hex('الأربعاء'),
  D4: hex('الخميس'),
  D5: hex('الجمعة'),
  D6: hex('السبت'),
  // Status labels
  COMP: hex('مكتمل'),
  PROG: hex('قيد التنفيذ'),
  NCOMP: hex('غير مكتمل'),
  STOP: hex('متوقف'),
  POST: hex('مؤجل'),
};

const d = h => Buffer.from(h, 'hex').toString('utf8');

const replacementMap = [
  // Garbled patterns found in dailyReportController.js
  // The actual garbled text from the file needs to be identified
];

function findGarbledInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find lines with non-ASCII non-Arabic looking characters
  const lines = content.split('\n');
  const issues = [];
  lines.forEach((line, i) => {
    // Check for lines that contain what looks like garbled Arabic
    // The pattern: strings between quotes that have unusual char sequences
    const matches = line.match(/'[^']*[^\x00-\x7F][^']*'/g);
    if (matches) {
      matches.forEach(m => {
        // Check if this Arabic string decodes correctly
        const str = m.slice(1, -1);
        const rawHex = Buffer.from(str, 'utf8').toString('hex');
        // Compare with known good hex values
        let isGood = false;
        Object.values(AR).forEach(goodHex => {
          if (rawHex === goodHex) isGood = true;
        });
        if (!isGood && str.length > 2) {
          issues.push({ line: i + 1, text: str, hex: rawHex });
        }
      });
    }
  });
  return issues;
}

console.log('=== Checking controller ===');
const ctrlIssues = findGarbledInFile(path.join(__dirname, 'controllers', 'dailyReportController.js'));
ctrlIssues.forEach(i => console.log('Line', i.line, ':', i.text, '[hex:', i.hex, ']'));

console.log('\n=== Checking dashboard ===');
const dashPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Admin', 'DailyReportsDashboard.jsx');
const dashIssues = findGarbledInFile(dashPath);
dashIssues.forEach(i => console.log('Line', i.line, ':', i.text, '[hex:', i.hex, ']'));

console.log('\nAll clean department hex values:');
Object.entries(AR).forEach(([k, v]) => console.log(k + ':', v, '->', d(v)));
