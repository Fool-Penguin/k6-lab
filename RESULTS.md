# K6 lab results

## Part 0
- Step 0.1, http_req_duration: 264.73 ms (1 request, so avg = min = med = max = p(90) = p(95) = 264.73 ms). Check `status is 200` passed 1/1.
- Step 0.2, requests, rate and p(95), and why the rate stays below 5: 80 requests, 3.82 req/s, p(95) = 272.63 ms. Each VU runs its iterations one after another, and one iteration is a request (~263 ms on average) plus `sleep(1)`, so it takes ~1.3 s (avg `iteration_duration` = 1.3 s). One VU therefore makes at most about 1 / 1.3 ≈ 0.77 req/s, and 5 VUs make about 5 × 0.77 ≈ 3.8 req/s. The rate could only reach 5 req/s if the response time were zero.
- Step 0.3, fixed number of iterations: `iterations` = exactly 20 (shared by 5 VUs, about 4 each), 20 requests, run ended after 5.7 s as soon as the 20th iteration finished. p(95) = 370.09 ms, checks 20/20. A duration gives load over a period of time; a number of iterations gives an exact amount of work.
- Step 0.6, exit code of the normal run and of the run with P95=300: normal run exit code **0** (all 3 thresholds passed, p(95) = 372.14 ms < 1500 ms, failed 0.00%, checks 100%). With `-e P95=300` exit code **99** (`p(95)<300` crossed, p(95) = 378.82 ms; the other two thresholds still passed; k6 printed "thresholds on metrics 'http_req_duration' have been crossed").
- Step 0.7, rules that passed, p(95), p(99), exit code after your change: thresholds set to `vus: 3`, `duration: '30s'`, `http_req_duration: ['p(95)<1000', 'p(99)<1500']`, `http_req_failed: ['rate<0.01']`. All three rules passed: p(95) = 381.78 ms (< 1000), p(99) = 389.52 ms (< 1500), failed 0.00% (0 of 68), exit code 0. Change: "95% within 1 second" tightened to "95% within 0.3 seconds" with `k6 run -e P95=300 07-requirement.js`. `p(95)<300` failed (p(95) = 371.15 ms), the other two still passed, exit code **99**.
- Step 0.8, what was wrong, and how the checks showed it: the request sent `excludedIngredients: ['pepperoni']` and `excludedTools: ['knife']` in lower case, but `explore.js` shows the API names are `"Pepperoni"` and `"Knife"` (tools: `["Knife","Pizza cutter","Scissors"]`). The names did not match, so QuickPizza ignored both exclusions, still answered 200, and sometimes returned a pizza with pepperoni or one cut with a knife. Buggy run (5 VUs, 20 s, 75 requests): `status is 200` 100%, `no pepperoni` 93% (5 failed), `no knife needed` 66% (25 failed), checks 86.66%, `http_req_failed` 0.00%. Fix: `['Pepperoni']` and `['Knife']`. After the fix all checks passed, 225/225 (100%). Why load found it: the recommendation is random, so one manual request often gets a correct pizza by chance (34% of pizzas needed a knife, only 7% had pepperoni) and looks fine. 75 requests under load sample many random pizzas, so even the rare pepperoni case showed up. Status codes alone (and `http_req_failed` = 0%) would have hidden it; only checks on the content found it.

## Part A results
| Step | Test type    | Users | Req/s | p(95) | Max | Failed | Checks |
| ---- | ------------ | ----- | ----- | ----- | --- | ------ | ------ |
| A1   | Smoke        | 1     | 0.57  | 338.83 ms | 340.24 ms | 0.00% | 100.00% (24/24) |
| A2   | Average load | 3     | 1.35  | 369.80 ms | 470.11 ms | 0.00% | 100.00% (328/328) |
| A3   | Stress       | 5     | 2.13  | 378.14 ms | 412.11 ms | 0.00% | 100.00% (520/520) |
| A4   | Spike        | 5     | 1.05  | 356.09 ms | 377.50 ms | 0.00% | 100.00% (196/196) |
| A5   | Soak         | 2     | 1.00  | 373.69 ms | 455.61 ms | 0.00% | 100.00% (880/880) |

Step A4, spike: the spike is at 30–35 s (1 to 5 users), held until 65 s, back to 1 user at 70 s. Response time per phase (computed from a CSV export of the same run, `--out csv`):

| Phase | Users | Requests | Avg | Median | p(95) |
| ----- | ----- | -------- | --- | ------ | ----- |
| 0–30 s (before) | 1 | 15 | 295 ms | 274 ms | 366 ms |
| 30–70 s (spike) | 5 | 92 | 287 ms | 271 ms | 353 ms |
| 70–140 s (after) | 3→1 | 40 | 296 ms | 277 ms | 369 ms |

The request rate rose about 5 times during the spike (about 0.5 to 2.3 req/s), but the response time did not rise: avg and median stayed at about 270–295 ms, the same as before. Because it never left its earlier level, it took 0 s to "return"; there was nothing to recover from. The only higher window (130–140 s, avg 321 ms) is during the ramp down with 1 user, so it is ordinary internet noise, not an effect of the spike. In the HTML report the spike is at about 21:53:30–21:54:10 in the VUs and Request Rate charts (rate up to about 2.5/s), while the avg line in Request Duration stays flat at about 280–300 ms and p(95) at about 335–355 ms. The short dip at about 21:54:10 is the drop from 5 to 1 users, when few requests fell in that window.

Step A5, soak: 2 users for 11 minutes in total (30 s up, 10 min hold, 30 s down), 660 requests, exit code 0. First minutes compared with last minutes (computed from a CSV export of the same run, `--out csv`):

| Period | Requests | Avg | Median | p(95) | Max | Failed |
| ------ | -------- | --- | ------ | ----- | --- | ------ |
| First 3 min (0–3) | 169 | 292 ms | 270 ms | 374 ms | 456 ms | 0.00% |
| Last 3 min (8–11) | 178 | 294 ms | 271 ms | 380 ms | 400 ms | 0.00% |

Neither the response time nor the error rate got worse as the test went on. Per minute, avg stayed between 288 and 295 ms and p(95) between 347 and 385 ms, with no upward trend; the error rate was 0.00% in every minute, and the slowest request (456 ms) was in the first minute, not near the end. In the HTML report (Request Duration chart, 22:08–22:18) the avg line stays flat at about 275–305 ms. The highest peak (p(99) about 445 ms) is at about 22:08:35, in the first minute; at the end p(95) and p(99) are about 385–395 ms, inside the 300–400 ms band they move in throughout.

## Part B
1. The results table for Steps A1 to A5 is filled in above in Part A results. Every test passed all its thresholds (exit code 0), with 0.00% failed requests and 100% checks.
2. A VU does not send one request per second; it runs one iteration at a time: request, then `sleep(1)`, then the next request. One iteration took about 1.3 s (≈ 263 ms response + 1 s sleep), so each VU made about 1 / 1.3 ≈ 0.77 req/s, and 5 VUs made about 5 × 0.77 ≈ 3.8 req/s, which matches the measured 3.82 req/s. Only a response time of 0 ms would give exactly 5 req/s, so the slower the server, the lower the rate.
3. Almost not. From A2 (3 users, 1.35 req/s) to A3 (5 users, 2.13 req/s) the load rose by about 58%, but p(95) grew only from 369.80 ms to 378.14 ms (about 8 ms, 2%) and the average from 293 ms to 295 ms. That is the same size as the normal noise between runs (p(95) in Step 0.6 varied by about 7 ms between two identical runs). In terms of the operational envelope: QuickPizza is built to serve many K6 learners around the world at the same time, so its envelope is far larger than 2 req/s. Both A2 and A3 ran far inside that envelope, where the response time stays flat, so the "stress" test was stress only compared with our own small "average" load, not for the system. Because we never got near the edge of the envelope, these tests cannot show where the response time starts to climb, or whether the system then slows down gracefully or fails; that needs tests near and beyond the edge, which we may only run on a system we own.
4. 0 s. The response time never left its normal level, so there was nothing to recover from. Before the spike (1 user): avg 295 ms, p(95) 366 ms. During the spike (5 users, about 5 times the request rate): avg 287 ms, p(95) 353 ms. After the spike: avg 296 ms, p(95) 369 ms. The Request Duration chart in `reports/a4-spike.html` stays flat through the spike (about 21:53:30–21:54:10).
5. No. First 3 minutes: avg 292 ms, p(95) 374 ms. Last 3 minutes: avg 294 ms, p(95) 380 ms. The error rate was 0.00% in every minute, and the slowest request (456 ms) was in the first minute. A soak test of several hours could reveal a **memory leak**, for example a server that keeps every request in a cache or list that is never cleared. Memory grows slowly, garbage collection pauses get longer, response times creep up over hours, and finally the process crashes with an out-of-memory error. A test of a few minutes is too short to see it. Similar slow leaks are database connections or file handles that are never closed, until the pool is exhausted and requests start failing.
6. The average hides the slowest users. In Step A2 the average was 293 ms, but p(95) was 370 ms and the maximum 470 ms: 1 request in 20 took longer than 370 ms, and the average does not show that. The journey also mixes fast and slow requests: in A2 the p(95) of the home page was 277 ms and of the recommendation 386 ms, so one overall average of about 290 ms describes neither of them. A few very fast requests can pull the average down while some users wait a long time, so a test on the average can pass while many users are unhappy. p(95) speaks directly about users ("95% of users wait less than X"), which is how a requirement should be written and tested.
7. First, network distance: our requests travel over the internet to QuickPizza's servers. No request in any run took less than about 256 ms, even the simple home page, and most of that is probably network travel time; in a lab, client and server are on the same local network, so the round trip is about 1 ms and the times would be much lower and more stable. Second, shared and unknown load: QuickPizza is used at the same time by learners all over the world, so its load changes from minute to minute for reasons we cannot see, while in a lab we control all the traffic and the only load is our test. (A third reason is different hardware and setup: a lab system has different CPU, memory, database and caching, and no CDN or load balancer in front of it.)
8. Hundreds of users sending requests back to back can slow down or break the site for its real users, which in effect is a denial-of-service (DoS) attack, even if it is not meant as one. Testing a system without permission breaks its terms of service and can break computer-crime laws (for example Thailand's Computer Crime Act), and your IP address can be blocked. It also costs the owner money (extra servers and bandwidth) and may set off their alarms and incident response. Finally, the results are not useful: you cannot see the server side, you do not know what else is running, and you cannot coordinate with the owners. A proper stress test is planned with the owners, on a system you own or have written permission to test.
9. App: Instagram. Vague requirement: "The feed should load quickly and posting a photo should not take long, even in the evening when everyone is online." Testable requirement: "With 50 users at the same time for 10 minutes (evening peak), loading the home feed answers 95% of requests within 500 ms and 99% within 1 s, liking a post answers 95% of requests within 300 ms, uploading a photo answers 95% of requests within 3 s, fewer than 0.5% of requests fail, and more than 99% of checks pass." The K6 thresholds that check it, with the journey split into `feed`, `like` and `upload` groups like `journey.js` (to be run only against a test environment we own or have written permission to test, never against the real Instagram):

   ```js
   export const options = {
     vus: 50,
     duration: '10m',
     thresholds: {
       'http_req_duration{group:::feed}': ['p(95)<500', 'p(99)<1000'],
       'http_req_duration{group:::like}': ['p(95)<300'],
       'http_req_duration{group:::upload}': ['p(95)<3000'],
       http_req_failed: ['rate<0.005'],
       checks: ['rate>0.99'],
     },
   };
   ```
