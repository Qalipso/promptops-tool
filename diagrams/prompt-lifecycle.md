# Diagram — Prompt Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Unregistered: register asset

    Unregistered --> Draft: create initial version

    Draft --> Draft: edit body / vars / config
    Draft --> Draft: add test cases
    Draft --> Draft: run tests

    Draft --> Active: promote (preconditions met)
    Draft --> Archived: discard draft

    Active --> Previous: new draft promoted
    Active --> Previous: rollback initiated

    Previous --> Active: rollback re-promotes
    Previous --> Archived: superseded again

    Archived --> [*]: cold storage (still queryable)

    note right of Draft
        Mutable.
        Not callable from runtime.
        Forks from Active.
    end note

    note right of Active
        Immutable.
        Served by runtime SDK.
        Exactly one per asset.
    end note

    note right of Previous
        Immutable.
        One-click rollback target.
        Kept warm.
    end note
```

## Explanation

The lifecycle has four states and only the `Draft` state is mutable. Every promotion is an atomic transition that shifts the previously active version to `Previous` and the draft to `Active`. Rollback is symmetric: a `Previous` version can be re-promoted at any time. Archived versions are never deleted — they remain queryable for audit and historical lookups, just hidden from the day-to-day UI.

This shape is intentional. By making `Draft` the only mutable state and forcing every other state to be immutable, the system makes "what was the prompt at time X" answerable with a single point lookup.
