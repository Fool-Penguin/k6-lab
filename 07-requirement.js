import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'token abcdef0123456789',
  },
};
// Requirement: 95% of requests within 1 s. Override with -e P95=... to make it fail.
const P95 = __ENV.P95 || 1000;

// With 3 users for 30 seconds, 95% within 1 s, 99% within 1.5 s, fewer than 1% fail.
export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_duration: [`p(95)<${P95}`, 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const body = JSON.stringify({ mustBeVegetarian: true });
  const res = http.post(`${BASE_URL}/api/pizza`, body, PARAMS);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'pizza has a name': (r) => r.json('pizza.name') !== undefined,
  });
  sleep(1);
}
