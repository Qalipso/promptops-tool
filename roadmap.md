# Roadmap

The roadmap is sequenced by the **risk it removes**, not by the features it adds. Each phase makes a specific category of production AI failure less likely.

## MVP — "Safe iteration on one asset"

Goal: An engineer can register one production prompt, write tests for it, edit it, see the diff, see regressions, and promote safely.

In scope:

- Prompt registry with stable IDs
- Asset model: variables, output contract, model config
- Version storage (immutable, content-addressed)
- Variable layer with type validation
- Test suite with assertion types: `exact`, `json_schema`, `contains`, `not_contains`
- Test runner (single provider adapter — OpenAI)
- Output comparison (per-test side-by-side)
- Regression detection (hard regressions only)
- Manual promotion with confirmation
- Audit log (write-only)
- Web UI: asset list, version view, diff view, regression report, promote button
- CLI: register asset, list assets, fetch active version
- Runtime SDK in one language (TypeScript)

Out of scope:

- Soft regression detection
- Performance regression detection
- LLM-judge assertions
- Multi-provider support
- Shadow promotion
- RBAC beyond owner/editor
- Notifications

Success criterion: I can use this on the Shadow Daily Reflection Classifier and never lose a regression.

## V1 — "Safe iteration across a portfolio"

Goal: A small team can manage 10–30 prompt assets together with shared discipline.

Additions:

- Soft regression detection (semantic similarity threshold)
- Performance regression detection (latency + cost)
- Anthropic provider adapter
- Local/self-hosted provider adapter (for Ollama, vLLM, etc.)
- LLM-judge assertion type
- `semantic_similarity` assertion type
- Tagging system for test cases (`smoke`, `slow`, `regression-guard`)
- Filtered test runs by tag
- Slack / webhook notifications on promotion and rollback
- Auto-generated release notes editor
- Stale draft warnings
- Asset ownership and a basic permission model (owner / editor / viewer)
- Runtime SDK in Python

Success criterion: A team of 4 can run a Monday prompt-review meeting from this UI.

## V2 — "Production-aware operations"

Goal: The system understands what is happening in production and helps the team learn from it.

Additions:

- Shadow promotion (N% traffic split, output capture)
- Capture-from-production: runtime SDK can stream production inputs to PromptOps for one-click "convert to test case"
- Suite drift detection: alert when production input distribution diverges from test suite coverage
- Quarterly suite health report: which tests are stale, which areas are uncovered, which assertions are flaky
- LLM-judge assertions with multiple judge models and consensus
- Multi-turn conversation prompt support (with conversation-level test cases)
- Cost dashboards per asset and per version
- Search across all prompts and changelogs
- Pluggable assertion functions (sandboxed user code)
- Cold-storage tier for archived versions and old audit log entries

Success criterion: A team can answer "is our AI getting better or worse this quarter?" with data, not vibes.

## Future Improvements (V3+)

Speculative, not committed:

- **Multi-tenant SaaS**: SSO, organizations, RBAC, audit log export, encryption at rest with customer keys.
- **Prompt portfolio search**: semantic search across all prompts ("find all prompts that classify into life areas").
- **Cross-asset refactoring**: extract a shared prompt fragment into a library and version it independently.
- **Synthetic test case generation**: an LLM proposes adversarial test cases given the current suite. Human always reviews.
- **A/B testing**: not just shadow, but real A/B with user-visible outputs and outcome metric attribution.
- **Cost optimization advisor**: suggest model downgrades for assets where the cheaper model passes the full suite.
- **Prompt linting**: static analysis of prompt bodies for common smells (unbounded variables, contradictory instructions, format leaks).
- **IDE integration**: edit prompts in VS Code with inline diff, test run, and promotion.
- **Localization workflow**: manage multi-locale prompt variants as first-class objects.
- **Compliance pack**: SOC 2 audit log export, PII-scrubbing on captured production inputs, deletion workflows where legally required.

## What Will Never Be in Scope

To stay honest about positioning:

- Model fine-tuning workflows.
- A general LLM playground for exploration.
- An agent orchestration framework.
- A model evaluation leaderboard.
- A vector database or RAG framework.
- A no-code "build an AI app" surface.

These are valid products. They are not this product. The discipline of saying no protects the value of saying yes.
