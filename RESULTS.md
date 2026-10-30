# K6 lab results

## Part 0
- Step 0.1, http_req_duration: 264.73 ms (1 request, so avg = min = med = max = p(90) = p(95) = 264.73 ms). Check `status is 200` passed 1/1.
- Step 0.2, requests, rate and p(95), and why the rate stays below 5: 80 requests, 3.82 req/s, p(95) = 272.63 ms. Each VU runs its iterations one after another, and one iteration is a request (~263 ms on average) plus `sleep(1)`, so it takes ~1.3 s (avg `iteration_duration` = 1.3 s). One VU therefore makes at most about 1 / 1.3 ≈ 0.77 req/s, and 5 VUs make about 5 × 0.77 ≈ 3.8 req/s. The rate could only reach 5 req/s if the response time were zero.
- Step 0.3, fixed number of iterations: `iterations` = exactly 20 (shared by 5 VUs, about 4 each), 20 requests, run ended after 5.7 s as soon as the 20th iteration finished. p(95) = 370.09 ms, checks 20/20. A duration gives load over a period of time; a number of iterations gives an exact amount of work.
- Step 0.6, exit code of the normal run and of the run with P95=300:
- Step 0.7, rules that passed, p(95), p(99), exit code after your change:
- Step 0.8, what was wrong, and how the checks showed it:

## Part A results
| Step | Test type    | Users | Req/s | p(95) | Max | Failed | Checks |
| ---- | ------------ | ----- | ----- | ----- | --- | ------ | ------ |
| A1   | Smoke        | 1     |       |       |     |        |        |
| A2   | Average load | 3     |       |       |     |        |        |
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
