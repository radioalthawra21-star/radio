export const formatDateArabic = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const monthStr = (month < 10 ? '0' : '') + month;
  const dayStr = (day < 10 ? '0' : '') + day;
  
  return [year, monthStr, dayStr].join('/');
};

export const formatDateTimeArabic = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  const monthStr = (month < 10 ? '0' : '') + month;
  const dayStr = (day < 10 ? '0' : '') + day;
  const hoursStr = (hours < 10 ? '0' : '') + hours;
  const minutesStr = (minutes < 10 ? '0' : '') + minutes;
  
  return [year, monthStr, dayStr].join('/') + ' ' + hoursStr + ':' + minutesStr;
};