export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel) {
    case 'critical': return 'bg-error/20 text-error';
    case 'high': return 'bg-warning/20 text-warning';
    case 'medium': return 'bg-info/20 text-info';
    case 'low': return 'bg-success/20 text-success';
    default: return 'bg-gray-200 text-gray-600';
  }
};

export const getActionLabel = (action) => {
  if (!action) return '-';
  return action.split(/(?=[A-Z])/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};
