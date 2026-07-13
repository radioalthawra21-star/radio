import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from './config.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export default function () {
  const res = http.get(`${BASE_URL}/api/health`, { tags: { name: 'health' } });

  check(res, {
    'health status is 200': (r) => r.status === 200,
    'response body has status success': (r) => {
      try {
        return JSON.parse(r.body).status === 'success';
      } catch { return false; }
    },
  });

  if (__ITER === 0) {
    console.log(`✓ Health check passed (${res.status})`);
    console.log(`✓ Response time: ${res.timings.duration}ms`);
  }

  sleep(1);
}
