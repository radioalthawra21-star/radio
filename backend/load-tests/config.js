export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export const CREDENTIALS = {
  admin: {
    username: process.env.LOADTEST_ADMIN_USER || 'loadtest',
    password: process.env.LOADTEST_ADMIN_PASS || '',
  },
  employee: {
    username: process.env.LOADTEST_EMP_USER || '',
    password: process.env.LOADTEST_EMP_PASS || '',
  },
};

export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<6000'],
};

export const OPTIONS = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};
