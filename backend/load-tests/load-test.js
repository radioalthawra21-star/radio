import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, CREDENTIALS, THRESHOLDS, OPTIONS } from './config.js';

export const options = {
  stages: OPTIONS.stages,
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:login}': ['p(95)<8000'],
    'http_req_duration{name:dashboard}': ['p(95)<5000'],
    'http_req_duration{name:users}': ['p(95)<4000'],
  },
};

export default function () {
  group('تسجيل الدخول', function () {
    const payload = JSON.stringify({
      username: CREDENTIALS.admin.username,
      password: CREDENTIALS.admin.password,
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    });

    check(loginRes, {
      '✅ login 200': (r) => r.status === 200,
      '✅ login success': (r) => {
        try { return JSON.parse(r.body).success === true; }
        catch { return false; }
      },
    });

    if (loginRes.status !== 200) {
      sleep(1);
      return;
    }

    const token = JSON.parse(loginRes.body).data.token;

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    sleep(1);

    group('لوحة التحكم', function () {
      const dashRes = http.get(`${BASE_URL}/api/dashboard/stats`, {
        ...authHeaders,
        tags: { name: 'dashboard' },
      });

      check(dashRes, {
        '✅ dashboard 200': (r) => r.status === 200,
        '✅ dashboard success': (r) => {
          try { return JSON.parse(r.body).success === true; }
          catch { return false; }
        },
      });
    });

    sleep(1);

    group('قائمة الموظفين', function () {
      const usersRes = http.get(`${BASE_URL}/api/users`, {
        ...authHeaders,
        tags: { name: 'users' },
      });

      check(usersRes, {
        '✅ users 200': (r) => r.status === 200,
        '✅ users success': (r) => {
          try { return JSON.parse(r.body).success === true; }
          catch { return false; }
        },
      });
    });

    sleep(1);

    group('التقارير اليومية', function () {
      const reportRes = http.get(`${BASE_URL}/api/daily-report/today`, {
        ...authHeaders,
        tags: { name: 'daily-report' },
      });

      check(reportRes, {
        '✅ daily-report 200': (r) => r.status === 200,
      });
    });

    sleep(1);

    group('حضور وانصراف', function () {
      const attRes = http.get(`${BASE_URL}/api/attendance/today`, {
        ...authHeaders,
        tags: { name: 'attendance' },
      });

      check(attRes, {
        '✅ attendance 200': (r) => r.status === 200,
      });
    });
  });

  sleep(2);
}
