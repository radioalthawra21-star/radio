const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

function getFontPath(filename) {
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist', 'fonts', filename);
  const pub = path.join(__dirname, '..', '..', 'frontend', 'public', 'fonts', filename);
  if (fs.existsSync(dist)) return dist;
  if (fs.existsSync(pub)) return pub;
  return dist;
}

const FONT_BASE64 = fs.readFileSync(getFontPath('MONTSERRAT-ARABIC-REGULAR.TTF')).toString('base64');
const FONT_LIGHT_PATH = getFontPath('MONTSERRAT-ARABIC-LIGHT.TTF');
const FONT_LIGHT_BASE64 = fs.existsSync(FONT_LIGHT_PATH)
  ? fs.readFileSync(FONT_LIGHT_PATH).toString('base64') : null;

function wrapHTML(cssContent, bodyContent) {
  const lightFace = FONT_LIGHT_BASE64
    ? `@font-face { font-family: 'Arabic'; src: url(data:font/ttf;base64,${FONT_LIGHT_BASE64}) format('truetype'); font-weight: 300; }`
    : '';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @font-face { font-family: 'Arabic'; src: url(data:font/ttf;base64,${FONT_BASE64}) format('truetype'); font-weight: normal; }
  ${lightFace}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arabic', sans-serif; direction: rtl; padding: 30px; color: #222; font-size: 12px; }
  ${cssContent}
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

const PAGE_CSS = `
  .header { text-align: center; margin-bottom: 25px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 4px; }
  .summary { margin: 20px 0; font-size: 14px; line-height: 2; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .summary-label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
  th { background: #182e4e; color: white; padding: 8px 6px; font-weight: bold; text-align: center; }
  td { border: 1px solid #ddd; padding: 6px; text-align: center; }
  tr:nth-child(even) { background: #f7f7f7; }
  .footer { margin-top: 30px; text-align: center; color: #888; font-size: 10px; }
  .exchange-rate { text-align: center; margin-top: 15px; font-size: 11px; color: #555; }
  .section-title { font-size: 14px; font-weight: bold; margin: 20px 0 8px 0; }
  .payslip-info { font-size: 11px; line-height: 1.8; margin: 10px 0; }
  .payslip-info div { display: flex; justify-content: space-between; max-width: 350px; }
  .payslip-info .label { font-weight: bold; }
  .net-row { font-weight: bold; background: #e8f0fe !important; }
`;

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function generateFinancialMiscPDF(data, helpers) {
  const { fmtDate, fmtCurrency } = helpers;
  const currency = data.currency || 'SYP';
  const rate = data.exchangeRate || 25000;
  const conv = (n) => fmtCurrency(n, currency, rate);

  const monthHtml = data.month
    ? `<div class="subtitle">الشهر: ${new Date(data.month + '-01').toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}</div>`
    : '';

  const typeLabel = (t) => t === 'income' ? 'إيراد' : 'مصروف';

  const tableRows = (data.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${typeLabel(item.type || item.meta?.type || 'expense')}</td>
      <td>${item.description || '-'}</td>
      <td>${fmtDate(item.date)}</td>
      <td>${conv(item.amount)}</td>
      <td>${item.notes || '-'}</td>
    </tr>
  `).join('\n');

  const body = `
    <div class="header">
      <div class="title">تقرير متفرقات مالية</div>
      <div class="subtitle">تاريخ التقرير: ${fmtDate(new Date())}</div>
      ${monthHtml}
    </div>
    <div class="summary">
      <div class="summary-row"><span class="summary-label">إجمالي الإيرادات:</span><span>${conv(data.incomeTotal)}</span></div>
      <div class="summary-row"><span class="summary-label">إجمالي المصروفات:</span><span>${conv(data.expenseTotal)}</span></div>
      <div class="summary-row"><span class="summary-label">الصافي:</span><span>${conv(data.netTotal)}</span></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>النوع</th><th>البيان</th><th>التاريخ</th><th>المبلغ (${currency})</th><th>ملاحظات</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="exchange-rate">سعر الصرف: 1$ = ${new Intl.NumberFormat('ar-SA').format(rate)} ل.س</div>
    <div class="footer">تم إنشاء التقرير بواسطة النظام</div>
  `;

  return generatePDF(wrapHTML(PAGE_CSS, body));
}

async function generatePayslipPDF(payslipData, helpers) {
  const { fmtDate } = helpers;

  const breakdown = payslipData.breakdown || payslipData.payrollInfo || {};
  const baseSalary = payslipData.baseSalary || breakdown.baseSalary || 0;
  const allowances = breakdown.allowances || 0;
  const bonuses = payslipData.bonuses || breakdown.bonuses || 0;
  const overtime = breakdown.overtime || 0;
  const deductions = payslipData.totalDeductions || breakdown.deductions || 0;
  const gross = payslipData.totalSalary || breakdown.grossSalary || baseSalary;
  const net = payslipData.netSalary || breakdown.netSalary || (gross - deductions);

  const emp = payslipData.employeeInfo || payslipData;

  const leaveTable = payslipData.leaveBalances ? `
    <div class="section-title">أرصدة الإجازات</div>
    <table>
      <thead><tr><th>نوع الإجازة</th><th>الرصيد</th><th>المستخدم</th><th>المتبقي</th></tr></thead>
      <tbody>
        ${(payslipData.leaveBalances || []).map((lb) => `
          <tr><td>${lb.type || '-'}</td><td>${lb.total || 0}</td><td>${lb.used || 0}</td><td>${(lb.total || 0) - (lb.used || 0)}</td></tr>
        `).join('\n')}
      </tbody>
    </table>
  ` : '';

  const netWordsHtml = payslipData.netWords
    ? `<div style="margin-top:15px;font-size:11px;"><span style="font-weight:bold;">المبلغ كتابةً:</span> ${payslipData.netWords}</div>`
    : '';

  const body = `
    <div style="text-align:left;margin-bottom:20px;">
      <div style="font-size:18px;font-weight:bold;">${payslipData.companyName || 'شركة إدارة الموارد البشرية'}</div>
    </div>
    <div class="header" style="text-align:left;">
      <div class="title" style="font-size:16px;">كشف المرتب</div>
      <div class="subtitle">رقم الكشف: ${payslipData.payslipNumber || payslipData.payrollId || ''}</div>
    </div>
    <div class="section-title">بيانات الموظف</div>
    <div class="payslip-info">
      <div><span class="label">الاسم:</span><span>${payslipData.employeeName || emp.name || ''}</span></div>
      <div><span class="label">القسم:</span><span>${emp.department || ''}</span></div>
      <div><span class="label">الفترة:</span><span>${payslipData.period || payslipData.payrollPeriod || ''}</span></div>
    </div>
    <table>
      <thead><tr><th>البند</th><th>الوصف</th><th>المبلغ</th></tr></thead>
      <tbody>
        <tr><td>الراتب الأساسي</td><td></td><td>${baseSalary.toFixed(2)} ريال</td></tr>
        <tr><td>البدلات</td><td></td><td>${allowances.toFixed(2)} ريال</td></tr>
        <tr><td>المكافآت</td><td></td><td>${bonuses.toFixed(2)} ريال</td></tr>
        <tr><td>الإضافي</td><td></td><td>${overtime.toFixed(2)} ريال</td></tr>
        <tr><td>الخصومات</td><td></td><td>${(-deductions).toFixed(2)} ريال</td></tr>
        <tr class="net-row"><td style="font-weight:bold;">صافي الراتب</td><td></td><td style="font-weight:bold;">${net.toFixed(2)} ريال</td></tr>
      </tbody>
    </table>
    ${leaveTable}
    ${netWordsHtml}
    <div class="footer">تم إنشاء التقرير بواسطة النظام</div>
  `;

  return generatePDF(wrapHTML(PAGE_CSS, body));
}

async function generatePDF(html) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '15px', right: '15px' },
    });
    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateFinancialMiscPDF, generatePayslipPDF };