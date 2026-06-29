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
    'human resources': ['hr', 'الموارد البشرية', 'human resources', 'موارد بشرية']
  };
  return map[d] || [d];
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
    if (existing) {
      return res.status(400).json({ success: false, message: 'لقد قمت بتعبئة التقرير اليومي مسبقاً' });
    }

    const user = req.user;
    const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const now = new Date();
    const reportDateStr = `${arabicDayNames[now.getDay()]} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

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

    const report = await DailyReport.create({
      userId: user._id,
      date: today,
      employeeName: user.name || '',
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      directManager: mgrName,
      reportDate: reportDateStr,
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
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم حفظ التقرير اليومي بنجاح ✓',
      data: report
    });
  } catch (error) {
    console.error('Error submitting daily report:', error);
    res.status(500).json({ success: false, message: 'خطأ في حفظ التقرير' });
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
