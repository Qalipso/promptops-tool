# Diagram — Release Decision Flow

```mermaid
flowchart TD
    Start([User clicks Promote]) --> P1{Draft has<br/>≥3 test cases?}
    P1 -->|No| Block1[Block: add test cases]
    P1 -->|Yes| P2{Recent test run<br/>exists < 24h?}
    P2 -->|No| Block2[Block: run tests]
    P2 -->|Yes| P3{Any unresolved<br/>hard regression?}
    P3 -->|Yes| Block3[Block: revise or override]
    P3 -->|No| P4{Changelog<br/>entry exists?}
    P4 -->|No| Block4[Block: add changelog]
    P4 -->|Yes| P5{Version bump<br/>consistent with diff?}
    P5 -->|No| Override{Override<br/>with justification?}
    Override -->|No| Revise[Adjust version]
    Revise --> P5
    Override -->|Yes| P6
    P5 -->|Yes| P6[Generate release notes draft]

    P6 --> Confirm{User confirms<br/>release notes?}
    Confirm -->|No| Edit[Edit release notes]
    Edit --> Confirm
    Confirm -->|Yes| Atomic[Atomic transition]

    Atomic --> A1[Append AUDIT.PROMOTE]
    A1 --> A2[Active → Previous]
    A2 --> A3[Draft → Active]
    A3 --> A4[Snapshot test suite]
    A4 --> A5[Invalidate Registry cache]
    A5 --> A6[Notify channel]
    A6 --> Done([Promotion complete])

    Done --> Watch[Show one-click<br/>rollback for 24h]

    Block1 --> Stop([Return to draft])
    Block2 --> Stop
    Block3 --> Stop
    Block4 --> Stop
```

## Explanation

Release decision is a gated pipeline. Each precondition is checked sequentially; any failure halts the flow with a specific remediation message. The atomic transition block runs as a single unit — either every step completes or the system stays on the previous active version. The audit log entry is written *before* the state mutation so that an audit gap is impossible: every state change has a preceding log line, even if the mutation itself were to fail.

The 24-hour rollback affordance is shown front and center after promotion. The expectation is that most regressions that escape pre-promotion checks reveal themselves quickly in production, and rollback should remain frictionless during that window.
