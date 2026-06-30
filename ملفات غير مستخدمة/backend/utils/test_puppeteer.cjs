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

const fontPath = getFontPath('MONTSERRAT-ARABIC-REGULAR.TTF');
console.log('Font path:', fontPath);
console.log('Font exists:', fs.existsSync(fontPath));

const FONT_BASE64 = fs.readFileSync(fontPath).toString('base64');

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @font-face { font-family: 'Arabic'; src: url(data:font/ttf;base64,${FONT_BASE64}) format('truetype'); }
  body { font-family: 'Arabic', sans-serif; direction: rtl; padding: 30px; color: #222; }
  .title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 20px; }
  .ar { font-size: 14px; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #182e4e; color: white; padding: 8px; }
  td { border: 1px solid #ddd; padding: 8px; text-align: center; }
</style>
</head>
<body>
  <div class="title">تقرير متفرقات مالية</div>
  <div class="ar">إجمالي الإيرادات: 1000 دولار</div>
  <div class="ar">إجمالي المصروفات: 500 دولار</div>
  <div class="ar">الصافي: 500 دولار</div>
  <table>
    <tr><th>#</th><th>البيان</th><th>المبلغ</th></tr>
    <tr><td>1</td><td>مبيعات</td><td>500</td></tr>
    <tr><td>2</td><td>إيجار</td><td>200</td></tr>
  </table>
</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    const outPath = path.join(__dirname, 'test_output.pdf');
    await page.pdf({ path: outPath, format: 'A4', printBackground: true });
    console.log('PDF written to:', outPath);
    console.log('File size:', fs.statSync(outPath).size, 'bytes');

    const buf = fs.readFileSync(outPath);
    const s = buf.toString('latin1');
    console.log('Has Arabic text in PDF:', /[\u0600-\u06FF]/.test(s));
    console.log('Has تقرير:', s.includes('تقرير'));
    console.log('Has إجمالي:', s.includes('إجمالي'));
  } finally {
    await browser.close();
  }
}

main().catch(e => console.error('Error:', e));
