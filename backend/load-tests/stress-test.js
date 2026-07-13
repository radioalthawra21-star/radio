import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, CREDENTIALS } from './config.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '1m', target: 400 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    username: CREDENTIALS.admin.username,
    password: CREDENTIALS.admin.password,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }

  const token = JSON.parse(loginRes.body).data.token;
  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'stress' },
  };

  const endpoints = [
    { url: `${BASE_URL}/api/health`, tag: 'health' },
    { url: `${BASE_URL}/api/dashboard/stats`, tag: 'dashboard' },
    { url: `${BASE_URL}/api/users`, tag: 'users' },
    { url: `${BASE_URL}/api/attendance/today`, tag: 'attendance' },
  ];

  for (const { url, tag } of endpoints) {
    const res = http.get(url, { ...authHeaders, tags: { name: tag } });
    check(res, {
      [`✅ ${tag} 200`]: (r) => r.status === 200,
    });
  }

  sleep(1);
}
