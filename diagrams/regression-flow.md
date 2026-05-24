# Diagram — Regression Detection Flow

```mermaid
flowchart TD
    Start([Test run complete<br/>for draft version]) --> Pair[Pair each test result<br/>with active version result]
    Pair --> Classify{Classify transition<br/>per case}

    Classify -->|PASS→PASS| Stable[Stable]
    Classify -->|FAIL→PASS| Improvement[Improvement]
    Classify -->|FAIL→FAIL| StillBroken[Still-broken]
    Classify -->|PASS→FAIL| HardCheck[Hard regression]
    Classify -->|inconclusive| Rerun[Mark for rerun]

    HardCheck --> Block[Block promotion]
    Block --> Override{Override<br/>with justification?}
    Override -->|No| Revise[Revise draft]
    Revise --> Start
    Override -->|Yes| Audit1[Log override<br/>with reason]
    Audit1 --> Allow[Allow promotion]

    Stable --> Sim{Semantic similarity<br/>drop > threshold?}
    Improvement --> Sim
    Sim -->|Yes| Soft[Soft regression — warn]
    Sim -->|No| OK[OK]

    OK --> PerfCheck{Latency or cost<br/>regression?}
    Soft --> PerfCheck
    PerfCheck -->|Yes| PerfWarn[Performance warning]
    PerfCheck -->|No| Ready[Ready to review]
    PerfWarn --> Ready

    Ready --> Report[Regression report]
    Allow --> Report
    StillBroken --> Report
    Rerun --> Report

    Report --> User([Surface to user])
```

## Explanation

Regression detection is a per-case classification followed by severity layering. The hot path is "PASS → FAIL" which blocks promotion by default. Soft and performance regressions emit warnings but never block. Inconclusive results (provider error, parse error) are flagged for rerun, never silently converted to pass or fail.

Overrides are intentionally friction-bearing: they require written justification and are recorded in the audit log. This makes "I overrode a regression because I was in a hurry" a visible decision rather than an invisible one.
