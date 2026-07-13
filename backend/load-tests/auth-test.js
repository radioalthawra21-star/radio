import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, CREDENTIALS, THRESHOLDS } from './config.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    ...THRESHOLDS,
    'http_req_duration{name:login}': ['p(95)<3000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    username: CREDENTIALS.admin.username,
    password: CREDENTIALS.admin.password,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns success true': (r) => {
      try { return JSON.parse(r.body).success === true; }
      catch { return false; }
    },
    'login returns token': (r) => {
      try { return !!JSON.parse(r.body).data?.token; }
      catch { return false; }
    },
  });

  if (__ITER === 0 && res.status === 200) {
    console.log(`✓ Login successful (${res.timings.duration}ms)`);
  }

  sleep(2);
}
