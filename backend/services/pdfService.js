const pdfGenerator = require('../utils/pdfGenerator');

const ARABIC_FONT_NAME = 'Arabic';

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtCurrency(n, currency = 'SYP', rate = 25000) {
  if (n == null || isNaN(n)) return '';
  const value = currency === 'SYP' ? n * rate : n;
  const locale = currency === 'SYP' ? 'ar-SA' : 'en-US';
  const symbol = currency === 'SYP' ? ' ل.س' : ' $';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: currency === 'SYP' ? 0 : 2,
    maximumFractionDigits: currency === 'SYP' ? 0 : 2,
  }).format(value) + symbol;
}

async function generateFinancialMiscPDF(data) {
  return pdfGenerator.generateFinancialMiscPDF(data, { fmtDate, fmtCurrency });
}

async function generatePayslipPDF(payslipData) {
  return pdfGenerator.generatePayslipPDF(payslipData, { fmtDate });
}

async function generatePDFBuffer(generatorFn, data) {
  return generatorFn(data);
}

module.exports = {
  generateFinancialMiscPDF,
  generatePayslipPDF,
  generatePDFBuffer,
  ARABIC_FONT_NAME,
};
