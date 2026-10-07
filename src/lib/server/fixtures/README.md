# Sales contract fixtures

`completed-sales-v2.json` is the historical synthetic aggregate exported by the backend public API authority test. Keep it for compatibility coverage.

The v3 fixtures were generated offline on 2026-10-06 with the adjacent NCKH-AI backend's `sales_concerns.score_ledger`, `sales_rubric.VERSIONS`, and `run_results.project_sales_part2`. They contain synthetic projected Part 2 results in completed aggregate envelopes, without transcripts or provider calls. The Web tests read these static JSON files and require neither Python nor a database.

Every label not listed below was false. Each turn used the facts disclosed by previous turns. The trust challenge was shown after concern 3 was resolved.

| Fixture run                             | True labels in successive turns                                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `synthetic-v3-restored`                 | `exchangeOffer exchangeConditions`; `walkingQuestion`; `fitQuestion`; `acknowledgment openQuestion`; `causeStatement`; `lightweightForWalking fitOrWalkTrial`; `originalSaleResponsibility routineMatchExplanation fitOrWalkTrial` |
| `synthetic-v3-exchange-20`              | `acknowledgment openQuestion painLocationQuestion`; `exchangeOffer exchangeConditions`                                                                                                                                             |
| `synthetic-v3-exchange-30`              | `acknowledgment openQuestion walkingQuestion`; `exchangeOffer exchangeConditions`                                                                                                                                                  |
| `synthetic-v3-exchange-clipped`         | `unauthorizedRefund unauthorizedDiscount`; `retractsUnauthorizedRefund retractsUnauthorizedDiscount acknowledgment openQuestion painLocationQuestion`; `exchangeOffer exchangeConditions`                                          |
| `synthetic-v3-partial-no-open-question` | `exchangeOffer exchangeConditions acknowledgment`; `walkingQuestion`; `fitQuestion`; `lightweightForWalking fitOrWalkTrial`                                                                                                        |

The restored fixture scores 100. The early exchanges score 20, 30, and 0, all with partially restored trust and an unresolved cause and solution. The zero score retains the two historical violation penalties after their promises were retracted. The ordinary partial fixture ends with `stopped_early` and scores 60; acknowledgment earns credit without resolving emotional handling because no open question was asked. Those differences are intentional v3 behavior.
