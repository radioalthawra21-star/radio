import api from './api';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadFinancialMiscPDF(params) {
  const response = await api.get('/pdf/financial-misc', {
    params,
    responseType: 'blob',
  });
  downloadBlob(response.data, 'financial-misc-report.pdf');
}

export async function downloadPayslipPDF(payrollId) {
  const response = await api.get(`/pdf/payslip/${payrollId}`, {
    responseType: 'blob',
  });
  downloadBlob(response.data, `payslip-${payrollId}.pdf`);
}
