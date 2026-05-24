# Diagram — Version Comparison Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Web UI
    participant Comparator as Output Comparison Layer
    participant Runner as Test Runner
    participant Provider as LLM Provider
    participant Store as Output Blob Store
    participant Diff as Diff Engine

    User->>UI: open compare (active vs draft)
    UI->>Comparator: request comparison(active_id, draft_id)
    Comparator->>Runner: run suite against active_id
    Runner->>Provider: execute N runs per test case
    Provider-->>Runner: outputs
    Runner->>Store: persist active outputs
    Comparator->>Runner: run suite against draft_id
    Runner->>Provider: execute N runs per test case
    Provider-->>Runner: outputs
    Runner->>Store: persist draft outputs
    Comparator->>Diff: prompt body diff (active vs draft)
    Comparator->>Diff: variable contract diff
    Comparator->>Diff: model config diff
    Comparator->>Diff: per-test output diff
    Diff-->>Comparator: structured diffs
    Comparator->>Comparator: classify per-test transitions
    Comparator-->>UI: prompt diff + output diff + behavior diff
    UI-->>User: side-by-side review
```

## Explanation

Comparison is not "compute on the fly." It runs both versions against the same test suite snapshot, persists both output sets to the blob store, then computes three diffs in parallel: the textual prompt diff, the structured contract/config diff, and the per-test output diff. The classification step (`PASS→PASS`, `PASS→FAIL`, etc.) turns raw outputs into the behavior diff the user actually reads first.

Caching is aggressive: if the active version was run within the comparison window and the suite snapshot has not changed, the active run is reused. Only the draft is guaranteed to re-run.
