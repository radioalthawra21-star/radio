/**
 * Authentication Middleware
 * Protects routes and verifies JWT tokens
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// Simple in-memory user cache to avoid DB lookup on every request
// TTL: 60 seconds — balances freshness vs performance
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// JWT secret key (should be in environment variables in production)
let JWT_SECRET = process.env.JWT_SECRET;

// Allow fallback in development only with warning
if (!JWT_SECRET) {
  if (process.env.NODE_ENV !== 'production') {
    JWT_SECRET = 'dev-secret-key-2024';
    console.warn('⚠️ WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production!');
  } else {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
  }
}

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك للوصول - يرجى تسجيل الدخول'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database (with in-memory cache to avoid DB hit on every request)
    let user;
    const cached = userCache.get(decoded.id);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      user = cached.user;
    } else {
      user = await User.findById(decoded.id).lean();
      if (user) {
        userCache.set(decoded.id, { user, timestamp: Date.now() });
      }
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'حسابك غير نشط - يرجى التواصل مع الإدارة'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('خطأ في التحقق من التوكن:', error.message);
    return res.status(401).json({
      success: false,
      message: 'توكن غير صالح'
    });
  }
};

const isDev = (role) => role === 'developer';

const isAdminLike = (role) => role === 'admin' || role === 'general_manager' || role === 'administrator';

const isManagerLike = (role) => role === 'manager' || role === 'hr';

/**
 * Middleware to check if user is admin (General Manager) only
 */
const adminOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (isAdminLike(role) || isDev(role)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه الصفحة'
    });
  }
};

/**
 * Middleware to check if user is manager, hr, or admin
 */
const managerOrAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (isManagerLike(role) || isAdminLike(role) || isDev(role)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه الصفحة'
    });
  }
};

/**
 * Middleware to check if user is employee (not admin)
 */
const employeeOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (role === 'employee') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'هذه الصفحة للموظفين فقط'
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

/**
 * Middleware to check if user is admin or HR
 */
const adminOrHR = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (isAdminLike(role) || role === 'hr' || isDev(role)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه الصفحة'
    });
  }
};

/**
 * Middleware to check if user is admin, hr, or an employee in HR department
 */
const adminOrHRorHrEmployee = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  const dept = (req.user?.department || '').toString().toLowerCase().trim();
  const isHrDept = dept === 'hr' || dept === 'الموارد البشرية' || dept.includes('موارد بشرية');
  if (isAdminLike(role) || role === 'hr' || (role === 'employee' && isHrDept)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول لهذه الصفحة'
    });
  }
};

/**
 * Middleware to check if user is General Manager (admin only, not hr)
 */
const generalManagerOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (isAdminLike(role) || isDev(role)) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول - هذه الصفحة للمدير العام فقط'
    });
  }
};


/**
 * Middleware - Observer read-only access
 */
const observerReadOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (role === 'observer') {
    if (req.method !== 'GET') {
      return res.status(403).json({
        success: false,
        message: 'المراقب لا يملك صلاحية التعديل'
      });
    }
  }
  next();
};

/**
 * Middleware - Check workflow stage access
 */
const workflowAccess = async (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  if (role === 'admin' || role === 'hr') {
    return next();
  }
  if (role === 'manager' || role === 'observer') {
    return next();
  }
  if (role === 'employee') {
    const taskId = req.params.id || req.body.taskId;
    if (taskId) {
      try {
        const Task = require('mongoose').model('Task');
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ success: false, message: 'المهمة غير موجودة' });
        const isAssigned = task.assignedTo.some(a => a.toString() === req.user._id.toString());
        const isCreator = task.createdBy.toString() === req.user._id.toString();
        if (isAssigned || isCreator) return next();
        return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول لهذه المهمة' });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'خطأ في التحقق من الصلاحية' });
      }
    } else {
      return next();
    }
  }
  next();
};

/**
 * Middleware - Department-scoped access
 */
const departmentOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase() || '';
  const dept = (req.user?.department || '').toString().toLowerCase().trim();
  if (role === 'admin' || role === 'hr') {
    return next();
  }
  req.departmentFilter = dept;
  next();
};
module.exports = {
  protect,
  adminOnly,
  adminOrHR,
  adminOrHRorHrEmployee,
  managerOrAdmin,
  employeeOnly,
  generalManagerOnly,
  workflowAccess,
  observerReadOnly,
  departmentOnly,
  generateToken,
  JWT_SECRET
};

