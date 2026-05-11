// frontend/src/features/payroll/utils/permissions.js

export const PERMISSIONS = {
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_EDIT: 'payroll:edit',
  PAYROLL_CREATE: 'payroll:create',
  PAYROLL_DELETE: 'payroll:delete',
  PAYROLL_APPROVE: 'payroll:approve',
  PAYROLL_EXPORT: 'payroll:export'
};

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PAYROLL_SPECIALIST: 'payroll_specialist',
  EMPLOYEE: 'employee',
  AUDITOR: 'auditor'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_EDIT,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_DELETE,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.PAYROLL_EXPORT
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_EDIT,
    PERMISSIONS.PAYROLL_APPROVE,
    PERMISSIONS.PAYROLL_EXPORT
  ],
  [ROLES.PAYROLL_SPECIALIST]: [
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_EDIT,
    PERMISSIONS.PAYROLL_CREATE,
    PERMISSIONS.PAYROLL_EXPORT
  ],
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.PAYROLL_VIEW
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.PAYROLL_VIEW,
    PERMISSIONS.PAYROLL_EXPORT
  ]
};

export const checkPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) return false;
  return ROLE_PERMISSIONS[userRole].includes(permission);
};

export const getUserPermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || [];
};