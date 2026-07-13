const DailyReport = require('../models/DailyReport');
const { User } = require('../models/User');

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

function getDeptValues(dept) {
  if (!dept) return [];
  const d = dept.toString().toLowerCase().trim();
  const map = {
    'financial': ['financial', 'المالي', 'المالية'],
    'المالي': ['financial', 'المالي', 'المالية'],
    'المالية': ['financial', 'المالي', 'المالية'],
    'it': ['it', 'تقنية المعلومات', 'الIT'],
    'تقنية المعلومات': ['it', 'تقنية المعلومات', 'الIT'],
    'الIT': ['it', 'تقنية المعلومات', 'الIT'],
    'marketing': ['marketing', 'التسويق'],
    'التسويق': ['marketing', 'التسويق'],
    'news': ['news', 'الأخبار'],
    'الأخبار': ['news', 'الأخبار'],
    'production': ['production', 'الإنتاج'],
    'الإنتاج': ['production', 'الإنتاج'],
    'live_broadcast': ['live_broadcast', 'البث المباشر'],
    'البث المباشر': ['live_broadcast', 'البث المباشر'],
    'hr': ['hr', 'الموارد البشرية', 'human resources', 'موارد بشرية'],
    'الموارد البشرية': ['hr', 'الموارد البشرية', 'human resources', 'موارد بشرية'],
    'human resources': ['hr', 'الموارد البشرية', 'human resources', 'موارد بشرية'],
    'المراسلين': ['المراسلين'],
    'التحرير': ['التحرير'],
    'الخدمات': ['الخدمات'],
    'العلاقات': ['العلاقات']
  };
  return map[d] || [d];
}

const canonicalDeptNames = {
  'financial': 'المالي',
  'المالي': 'المالي',
  'المالية': 'المالي',
  'it': 'تقنية المعلومات',
  'تقنية المعلومات': 'تقنية المعلومات',
  'الIT': 'تقنية المعلومات',
  'marketing': 'التسويق',
  'التسويق': 'التسويق',
  'news': 'الأخبار',
  'الأخبار': 'الأخبار',
  'production': 'الإنتاج',
  'الإنتاج': 'الإنتاج',
  'live_broadcast': 'البث المباشر',
  'البث المباشر': 'البث المباشر',
  'hr': 'الموارد البشرية',
  'الموارد البشرية': 'الموارد البشرية',
  'human resources': 'الموارد البشرية',
  'موارد بشرية': 'الموارد البشرية',
  'المراسلين': 'المراسلين',
  'التحرير': 'التحرير',
  'الخدمات': 'الخدمات',
  'العلاقات': 'العلاقات'
};


function normalizeDeptName(dept) {
  if (!dept) return 'غير محدد';
  const d = dept.toString().trim();
  return canonicalDeptNames[d] || d;
}

exports.getManager = async (req, res) => {
  try {
    const userDept = req.user.department;
    if (!userDept) {
      return res.json({ success: true, data: { managerName: '' } });
    }
    const deptValues = getDeptValues(userDept);
    const manager = await User.findOne({
      role: 'manager',
      department: { $in: deptValues },
      isActive: true
    }).select('name').lean();
    res.json({
      success: true,
      data: { managerName: manager ? manager.name : '' }
    });
  } catch (error) {
    console.error('Error fetching department manager:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المدير المباشر' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const existing = await DailyReport.findOne({
      userId: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });
    res.json({
      success: true,
      data: { hasSubmitted: !!existing }
    });
  } catch (error) {
    console.error('Error checking daily report status:', error);
    res.status(500).json({ success: false, message: 'خطأ في التحقق من حالة التقرير' });
  }
};

exports.getTodayReport = async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const report = await DailyReport.findOne({
      userId: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });
    res.json({
      success: true,
      data: report || null
    });
  } catch (error) {
    console.error('Error fetching today report:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقرير' });
  }
};

exports.submitReport = async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const existing = await DailyReport.findOne({
      userId: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });
    const updateData = {
      employeeName: req.user.name || '',
      department: req.user.department || '',
      jobTitle: req.user.jobTitle || '',
      directManager: req.body.directManager || '',
      reportDate: (() => {
        const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const n = new Date();
        return `${arabicDayNames[n.getDay()]} - ${n.getDate()}/${n.getMonth() + 1}/${n.getFullYear()}`;
      })(),
      achievements: (req.body.achievements || []).map(a => ({
        name: a.name,
        description: a.description || '',
        target: a.target || '',
        status: a.status || 'in_progress',
        completionPercentage: Math.min(100, Math.max(0, Number(a.completionPercentage) || 0))
      })),
      priorities: {
        first: req.body.priorities?.first || '',
        second: req.body.priorities?.second || '',
        third: req.body.priorities?.third || ''
      },
      challenges: {
        obstacles: req.body.challenges?.obstacles || '',
        supportRequired: req.body.challenges?.supportRequired || ''
      },
      suggestions: {
        performanceVision: req.body.suggestions?.performanceVision || ''
      },
      bestWork: {
        items: (req.body.bestWork?.items || []).map(item => ({
          title: item.title || '',
          publishLink: item.publishLink || ''
        }))
      }
    };

    const user = req.user;
    let mgrName = req.body.directManager || '';
    if (!mgrName) {
      const deptValues = getDeptValues(user.department);
      const manager = await User.findOne({
        role: 'manager',
        department: { $in: deptValues },
        isActive: true
      }).select('name').lean();
      mgrName = manager ? manager.name : '';
    }
    updateData.directManager = mgrName;

    let report;
    if (existing) {
      Object.assign(existing, updateData);
      report = await existing.save();
    } else {
      updateData.userId = user._id;
      updateData.date = today;
      report = await DailyReport.create(updateData);
    }

    res.status(200).json({
      success: true,
      message: existing ? 'تم تحديث التقرير اليومي بنجاح ✓' : 'تم حفظ التقرير اليومي بنجاح ✓',
      data: report
    });
  } catch (error) {
    console.error('Error submitting daily report:', error);
    res.status(500).json({ success: false, message: 'خطأ في حفظ التقرير' });
  }
};

exports.getAdminTodaySummary = async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();

    const todayReports = await DailyReport.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'name department role').lean();

    const allUsers = await User.find({
      isActive: true,
      role: { $nin: ['admin', 'developer'] }
    }).select('name department role').lean();

    const submittedUserIds = new Set(
      todayReports.map(r => r.userId?._id?.toString()).filter(Boolean)
    );

    const submittedUsers = todayReports.map(r => ({
      _id: r.userId?._id || r.userId,
      name: r.employeeName || r.userId?.name || '',
      department: normalizeDeptName(r.department || r.userId?.department || ''),
      reportId: r._id
    }));

    const notSubmittedUsers = allUsers
      .filter(u => !submittedUserIds.has(u._id.toString()))
      .map(u => ({
        _id: u._id,
        name: u.name,
        department: normalizeDeptName(u.department || '')
      }));

    const depGroups = {};
    const addToGroup = (dept) => {
      const key = normalizeDeptName(dept);
      if (!depGroups[key]) {
        depGroups[key] = { department: key, total: 0, submitted: 0 };
      }
    };
    allUsers.forEach(u => {
      addToGroup(u.department || 'غير محدد');
      depGroups[normalizeDeptName(u.department || 'غير محدد')].total++;
    });
    todayReports.forEach(r => {
      const dept = normalizeDeptName(r.department || r.userId?.department || 'غير محدد');
      if (depGroups[dept]) {
        depGroups[dept].submitted++;
      }
    });

    const departmentStats = Object.values(depGroups).map(d => ({
      ...d,
      notSubmitted: d.total - d.submitted,
      percentage: d.total > 0 ? Math.round((d.submitted / d.total) * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        totalEmployees: allUsers.length,
        submittedCount: todayReports.length,
        notSubmittedCount: allUsers.length - todayReports.length,
        submittedUsers,
        notSubmittedUsers,
        departmentStats,
        reports: todayReports
      }
    });
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات التقارير' });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate('userId', 'name department jobTitle email')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }

    // Access control: admin/HR/developer can see all, employees only their own
    const role = req.user.role?.toLowerCase();
    const isOwner = report.userId?._id?.toString() === req.user._id.toString() || 
                    report.userId?.toString() === req.user._id.toString();
    if (role !== 'admin' && role !== 'hr' && role !== 'developer' && role !== 'manager' && !isOwner) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض هذا التقرير' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقرير' });
  }
};

exports.getEmployeeReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Access control: admin/HR/developer can see all, employees only their own, managers their department
    const role = req.user.role?.toLowerCase();
    if (role !== 'admin' && role !== 'hr' && role !== 'developer' && role !== 'manager' && userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض تقارير هذا الموظف' });
    }
    
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const reports = await DailyReport.find({ userId })
      .sort({ date: -1 })
      .skip((parseInt(page) - 1) * limitNum)
      .limit(limitNum);
    const total = await DailyReport.countDocuments({ userId });
    res.json({
      success: true,
      data: { reports, total, page: parseInt(page), pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Error fetching employee reports:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقارير الموظف' });
  }
};

exports.exportEmployeeReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name department').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
    }
    const reports = await DailyReport.find({ userId }).sort({ date: -1 }).lean();

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Radio System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('التقارير اليومية');

    sheet.columns = [
      { header: 'التاريخ', key: 'date', width: 20 },
      { header: 'اسم الموظف', key: 'employeeName', width: 25 },
      { header: 'القسم', key: 'department', width: 20 },
      { header: 'المسمى الوظيفي', key: 'jobTitle', width: 20 },
      { header: 'المدير المباشر', key: 'directManager', width: 20 },
      { header: 'الإنجازات', key: 'achievements', width: 50 },
      { header: 'الأولوية الأولى', key: 'priority1', width: 30 },
      { header: 'الأولوية الثانية', key: 'priority2', width: 30 },
      { header: 'الأولوية الثالثة', key: 'priority3', width: 30 },
      { header: 'المعوقات', key: 'obstacles', width: 40 },
      { header: 'الدعم المطلوب', key: 'supportRequired', width: 40 },
      { header: 'رؤية الأداء', key: 'performanceVision', width: 40 },
      { header: 'أفضل مواد (تقييم الخميس)', key: 'bestWork', width: 50 }
    ];

    reports.forEach(r => {
      const achText = (r.achievements || []).map(a =>
        `${a.name}${a.description ? ': ' + a.description : ''}${a.completionPercentage ? ' (' + a.completionPercentage + '%)' : ''}`
      ).join('\n');
      sheet.addRow({
        date: r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '',
        employeeName: r.employeeName || '',
        department: r.department || '',
        jobTitle: r.jobTitle || '',
        directManager: r.directManager || '',
        achievements: achText,
        priority1: r.priorities?.first || '',
        priority2: r.priorities?.second || '',
        priority3: r.priorities?.third || '',
        obstacles: r.challenges?.obstacles || '',
        supportRequired: r.challenges?.supportRequired || '',
        performanceVision: r.suggestions?.performanceVision || '',
        bestWork: (r.bestWork?.items || []).map(item =>
          `${item.title}${item.publishLink ? ' (' + item.publishLink + ')' : ''}`
        ).join('\n')
      });
    });

    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    sheet.rtl = true;

    const fileName = encodeURIComponent(`${user.name}_التقارير_اليومية.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting employee reports:', error);
    res.status(500).json({ success: false, message: 'خطأ في تصدير التقارير' });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    // Only admin, HR, or the report owner can delete
    const role = req.user.role?.toLowerCase();
    const isOwner = report.userId?.toString() === req.user._id.toString();
    if (role !== 'admin' && role !== 'hr' && role !== 'developer' && !isOwner) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بحذف هذا التقرير' });
    }
    await DailyReport.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف التقرير بنجاح' });
  } catch (error) {
    console.error('Error deleting daily report:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في حذف التقرير' });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const reports = await DailyReport.find({ userId: req.user._id })
      .sort({ date: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    const total = await DailyReport.countDocuments({ userId: req.user._id });
    res.json({
      success: true,
      data: { reports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقارير' });
  }
};
