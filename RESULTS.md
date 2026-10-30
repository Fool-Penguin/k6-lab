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
| A3   | Stress       | 5     |       |       |     |        |        |
| A4   | Spike        | 5     |       |       |     |        |        |
| A5   | Soak         | 2     |       |       |     |        |        |

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
