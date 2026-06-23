const newsDepartmentOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  const dept = (req.user?.department || '').toString().toLowerCase().trim();
  if (role === 'admin' || dept === 'news' || dept === 'الأخبار' || dept === 'تحرير' || dept.includes('news') || dept.includes('إعلام') || dept.includes('تحرير')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'هذه الخدمة متاحة فقط لموظفي قسم الأخبار'
  });
};

const newsManagerOrAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  const dept = (req.user?.department || '').toString().toLowerCase().trim();
  const isNews = dept === 'news' || dept === 'الأخبار' || dept === 'تحرير' || dept.includes('news') || dept.includes('إعلام') || dept.includes('تحرير');
  if (role === 'admin' || (isNews && role === 'manager')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بالوصول - هذه الخدمة لمديري الأخبار فقط'
  });
};

module.exports = { newsDepartmentOnly, newsManagerOrAdmin };
