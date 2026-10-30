# K6 lab results

## Part 0

### Step 0.1, http_req_duration
- `http_req_duration`: **264.73 ms**
- Only 1 request, so avg = min = med = max = p(90) = p(95) = 264.73 ms.
- Check `status is 200`: passed 1/1.

### Step 0.2, requests, rate and p(95), and why the rate stays below 5
- Requests: **80**
- Rate: **3.82 req/s**
- p(95): **272.63 ms**
- Why the rate stays below 5:
  - Each VU runs its iterations one after another, never in parallel.
  - One iteration = one request (~263 ms) + `sleep(1)` = ~1.3 s (avg `iteration_duration` = 1.3 s).
  - So one VU makes about 1 / 1.3 ≈ 0.77 req/s, and 5 VUs make about 5 × 0.77 ≈ 3.8 req/s.
  - The rate could reach 5 req/s only if the response time were zero.

### Step 0.3, fixed number of iterations
- `iterations`: exactly **20** (shared by 5 VUs, about 4 each), 20 requests.
- The run ended after **5.7 s**, as soon as the 20th iteration finished.
- p(95) = 370.09 ms, checks 20/20.
- A duration gives load over a period of time; a number of iterations gives an exact amount of work.

### Step 0.6, exit code of the normal run and of the run with P95=300

| Run | p(95) | `p(95)` rule | Failed | Checks | Exit code |
| --- | ----- | ------------ | ------ | ------ | --------- |
| `k6 run 06-thresholds.js` | 372.14 ms | ✓ `p(95)<1500` | 0.00% ✓ | 100% ✓ | **0** |
| `k6 run -e P95=300 06-thresholds.js` | 378.82 ms | ✗ `p(95)<300` | 0.00% ✓ | 100% ✓ | **99** |

- With P95=300, k6 printed: `thresholds on metrics 'http_req_duration' have been crossed`.

### Step 0.7, rules that passed, p(95), p(99), exit code after your change
- Options in `07-requirement.js`:
  - `vus: 3`, `duration: '30s'`
  - `http_req_duration: ['p(95)<1000', 'p(99)<1500']`
  - `http_req_failed: ['rate<0.01']`
- Run with the requirement as given (exit code **0**):

  | Rule | Measured | Result |
  | ---- | -------- | ------ |
  | `p(95)<1000` | 381.78 ms | ✓ passed |
  | `p(99)<1500` | 389.52 ms | ✓ passed |
  | `rate<0.01` (failed) | 0.00% (0 of 68) | ✓ passed |

- Change: "95% within 1 second" tightened to "95% within 0.3 seconds", run with `k6 run -e P95=300 07-requirement.js`.
  - `p(95)<300` failed (p(95) = 371.15 ms); the other two rules still passed.
  - Exit code: **99**

### Step 0.8, what was wrong, and how the checks showed it
- **What was wrong:** the request used lower-case names, `excludedIngredients: ['pepperoni']` and `excludedTools: ['knife']`.
  - `explore.js` shows the API names are `"Pepperoni"` and `"Knife"` (tools: `["Knife","Pizza cutter","Scissors"]`).
  - The names did not match, so QuickPizza ignored both exclusions. It still answered 200, but sometimes with pepperoni or a pizza cut with a knife.
- **Buggy run** (5 VUs, 20 s, 75 requests):

  | Check | Passed |
  | ----- | ------ |
  | `status is 200` | 100% |
  | `no pepperoni` | 93% (5 failed) |
  | `no knife needed` | 66% (25 failed) |
  | All checks | 86.66% |

  - `http_req_failed` was still 0.00%.
- **Fix:** `excludedIngredients: ['Pepperoni']` and `excludedTools: ['Knife']`. All checks then passed, 225/225 (100%).
- **Why load found it when one manual request might not:**
  - The recommendation is random, so one manual request often gets a correct pizza by chance (only 34% needed a knife and 7% had pepperoni).
  - 75 requests under load sample many random pizzas, so even the rare pepperoni case showed up.
  - Status codes alone (and `http_req_failed` = 0%) would have hidden it; only checks on the content of the answer found it.

## Part A results
| Step | Test type    | Users | Req/s | p(95)     | Max       | Failed | Checks            |
| ---- | ------------ | ----- | ----- | --------- | --------- | ------ | ----------------- |
| A1   | Smoke        | 1     | 0.57  | 338.83 ms | 340.24 ms | 0.00%  | 100.00% (24/24)   |
| A2   | Average load | 3     | 1.35  | 369.80 ms | 470.11 ms | 0.00%  | 100.00% (328/328) |
| A3   | Stress       | 5     | 2.13  | 378.14 ms | 412.11 ms | 0.00%  | 100.00% (520/520) |
| A4   | Spike        | 5     | 1.05  | 356.09 ms | 377.50 ms | 0.00%  | 100.00% (196/196) |
| A5   | Soak         | 2     |       |           |           |        |                   |

### Step A4, spike
- Timeline: 1 user until 30 s, jump to 5 users at 30–35 s, hold until 65 s, back to 1 user at 70 s.
- In the HTML report the spike is at about 21:53:30–21:54:10 (VUs and Request Rate charts).
- Response time per phase (computed from a CSV export of the same run, `--out csv`):

  | Phase | Users | Requests | Avg | Median | p(95) |
  | ----- | ----- | -------- | --- | ------ | ----- |
  | 0–30 s (before) | 1 | 15 | 295 ms | 274 ms | 366 ms |
  | 30–70 s (spike) | 5 | 92 | 287 ms | 271 ms | 353 ms |
  | 70–140 s (after) | 3→1 | 40 | 296 ms | 277 ms | 369 ms |

- **Did the response time rise during the spike?** No.
  - The request rate rose about 5 times (about 0.5 to 2.3 req/s; the report peaks at about 2.5/s).
  - The avg line in Request Duration stayed flat at about 280–300 ms, and p(95) at about 335–355 ms, the same as before the spike.
- **How long did it take to return to its earlier level?** 0 s. It never left its earlier level, so there was nothing to recover from.
- Two small bumps in the chart are not caused by the spike:
  - The dip at about 21:54:10 is the drop from 5 to 1 users, when few requests fell in that window.
  - The rise at the end (avg about 321 ms in 130–140 s) happened with only 1 user during the ramp down, so it is ordinary internet noise.

## Part B
1.
2.
3.
4.
5.
6.
7.
8.
9.
