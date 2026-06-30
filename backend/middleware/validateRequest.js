/**
 * Request Validation Middleware
 * Validates request body fields based on rules.
 * Usage: router.post('/path', validateRequest({ name: 'required|string|min:3' }), handler)
 */

const validateRequest = (rules) => {
  return (req, res, next) => {
    if (!rules || typeof rules !== 'object') return next();

    const errors = [];

    for (const [field, ruleStr] of Object.entries(rules)) {
      const ruleList = ruleStr.split('|');
      const value = req.body[field];

      for (const rule of ruleList) {
        if (rule === 'required' && (value === undefined || value === null || value === '')) {
          errors.push(`${field} مطلوب`);
          break;
        }

        if (value === undefined || value === null) continue;

        if (rule === 'string' && typeof value !== 'string') {
          errors.push(`${field} يجب أن يكون نصاً`);
        }

        if (rule.startsWith('min:')) {
          const min = parseInt(rule.split(':')[1]);
          if (typeof value === 'string' && value.trim().length < min) {
            errors.push(`${field} يجب أن يكون ${min} أحرف على الأقل`);
          }
          if (typeof value === 'number' && value < min) {
            errors.push(`${field} يجب أن يكون ${min} على الأقل`);
          }
        }

        if (rule.startsWith('max:')) {
          const max = parseInt(rule.split(':')[1]);
          if (typeof value === 'string' && value.length > max) {
            errors.push(`${field} يجب أن لا يتجاوز ${max} حرفاً`);
          }
          if (typeof value === 'number' && value > max) {
            errors.push(`${field} يجب أن لا يتجاوز ${max}`);
          }
        }

        if (rule === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field} يجب أن يكون بريداً إلكترونياً صحيحاً`);
          }
        }

        if (rule === 'number' && isNaN(Number(value))) {
          errors.push(`${field} يجب أن يكون رقماً`);
        }

        if (rule === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${field} يجب أن يكون قيماً منطقية (true/false)`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    next();
  };
};

module.exports = { validateRequest };
