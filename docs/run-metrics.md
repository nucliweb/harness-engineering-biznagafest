| ticket | phase | status | duration_ms | num_turns | total_cost_usd | models (input/output tokens) | cache_read | cache_creation |
|---|---|---|---|---|---|---|---|---|
| DEMO-1 | spec-clarify | success | 196840 | 25 | 1.8605 | claude-fable-5-1 228/11421; claude-haiku-5-5 10/3814 | 531952 | 81593 |
| DEMO-1 | spec-plan | success | 681521 | 63 | 5.2097 | claude-fable-5-1 614/30020; claude-haiku-5-5 24/10054; claude-opus-5-5 46/26119 | 2465874 | 257892 |
| DEMO-1 | spec-implement | success | 384166 | 27 | 3.4824 | claude-fable-5-1 290/22015; claude-sonnet-5-5 51/14640; claude-opus-5-5 20/6629 | 1280932 | 186907 |
| DEMO-1 | spec-validate | blocked SETUP_ERROR (chained shell commands denied; validator prompt fixed) | 81397 | 10 | 1.1322 | claude-fable-5-1 290/3821; claude-haiku-5-5 10/2956 | 530990 | 55212 |
| DEMO-1 | spec-validate | success | 106125 | 8 | 1.1867 | claude-fable-5-1 226/4159; claude-haiku-5-5 20/3040; claude-sonnet-5-5 8/1835 | 555542 | 75309 |
| DEMO-2 | spec-clarify | success | 125426 | 37 | 0.7970 | claude-opus-5-5 16/11748; claude-haiku-5-5 12/3644 | n/a | n/a |
| DEMO-2 | spec-plan | success | 240444 | 64 | 1.6285 | claude-opus-5-5 24/26465; claude-haiku-5-5 26/7192 | n/a | n/a |
| DEMO-3 | spec-clarify | success (attempt 1, before the Gate B recalibration) | 189255 | 32 | 0.9885 | claude-opus-5-5 22/14750; claude-haiku-5-5 24/11608 | 696827 | 116872 |
| DEMO-3 | spec-plan | blocked NEEDS_DECISION (attempt 1: Split at 12 files against 10; threshold moved to 15, see the journal) | 272500 | 46 | 1.7665 | claude-opus-5-5 26/30467; claude-haiku-5-5 24/11775 | 1214334 | 154196 |
| DEMO-3 | spec-clarify | success (attempt 2) | 142309 | 44 | 0.7307 | claude-opus-5-5 24/14173; claude-haiku-5-5 10/3481 | 706354 | 60552 |
| DEMO-3 | spec-plan | blocked NEEDS_DECISION (attempt 2: Split at 340 lines against 300; threshold moved to 500, see the journal) | 544025 | 58 | 2.6488 | claude-opus-5-5 28/60698; claude-haiku-5-5 22/8800 | 1422476 | 183248 |
| DEMO-3 | spec-clarify | success (attempt 3) | 98771 | 30 | 0.6459 | claude-opus-5-5 12/8483; claude-haiku-5-5 12/5125 | 374623 | 81106 |
| DEMO-3 | spec-plan | cut off by the Claude usage limit (attempt 3; BLOCKED.md SETUP_ERROR, resume after the reset) | 426697 | 56 | 2.2948 | claude-opus-5-5 22/47559; claude-haiku-5-5 22/11772 | 975788 | 185555 |
| DEMO-3 | spec-clarify | success | 89823 | 16 | 0.6034 | claude-opus-5-5 18/6179; claude-haiku-5-5 10/4177 | 450051 | 78138 |
| DEMO-3 | spec-plan | success | 447120 | 37 | 2.3908 | claude-opus-5-5 60/43717; claude-haiku-5-5 32/16148 | 2014604 | 207678 |
| DEMO-3 | spec-implement | success | 436418 | 31 | 2.4208 | claude-opus-5-5 60/38282; claude-sonnet-5-5 57/16195 | 1880871 | 220323 |
| DEMO-3 | spec-validate | blocked SETUP_ERROR (pnpm --version missing from the allowlist; added, re-run below) | 30446 | 7 | 0.3630 | claude-opus-5-5 12/2003; claude-haiku-5-5 4/1025 | 257985 | 46014 |
| DEMO-3 | spec-validate | success | 66996 | 7 | 0.1071 | claude-opus-5-5 12/1509; claude-haiku-5-5 12/2484 | 363495 | 13305 |
| DEMO-4 | spec-clarify | success (attempt 1) | 85475 | 15 | 0.5587 | claude-opus-5-5 18/5442; claude-haiku-5-5 8/3824 | 408433 | 72584 |
| DEMO-4 | spec-plan | blocked NEEDS_DECISION (attempt 1: Split at 4 new exported symbols against 3; threshold moved to 6, see the journal) | 312883 | 46 | 2.1264 | claude-opus-5-5 48/36256; claude-haiku-5-5 22/9106 | 2111902 | 163751 |
| DEMO-4 | spec-clarify | success (attempt 2) | 86433 | 15 | 0.5637 | claude-opus-5-5 18/5586; claude-haiku-5-5 10/3134 | 499286 | 71037 |
| DEMO-4 | spec-plan | success (attempt 2) | 281377 | 21 | 2.1799 | claude-opus-5-5 60/34000; claude-haiku-5-5 22/13082 | 1924550 | 201746 |
| DEMO-4 | spec-implement | success (attempt 2) | 390782 | 29 | 2.2481 | claude-opus-5-5 60/33663; claude-sonnet-5-5 46/14121 | 1827894 | 206997 |
| DEMO-4 | spec-validate | RED, blocked (attempt 2: pnpm test failed on a runner test that inherited CLAUDE_FLAGS from the run itself; test fixed) | 94038 | 15 | 0.5075 | claude-opus-5-5 24/3678; claude-haiku-5-5 14/3207 | 649349 | 63657 |
| DEMO-4 | spec-clarify | success | 70629 | 17 | 0.5686 | claude-opus-5-5 18/5561; claude-haiku-5-5 8/3320 | 421541 | 72269 |
| DEMO-4 | spec-plan | success | 439425 | 40 | 2.5880 | claude-opus-5-5 60/44298; claude-haiku-5-5 24/11403 | 2186646 | 221528 |
| DEMO-4 | spec-implement | success | 478866 | 31 | 2.4873 | claude-opus-5-5 60/38376; claude-sonnet-5-5 47/14695 | 1989096 | 228170 |
| DEMO-4 | spec-validate | success | 63337 | 7 | 0.3579 | claude-opus-5-5 12/1369; claude-haiku-5-5 18/2388 | 374118 | 57957 |
