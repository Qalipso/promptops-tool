'use client';

import {
  type ActiveBody,
  type EvalImportRow,
  type TestCaseRow,
  compileSpecAction,
  deleteTestCaseAction,
  evalImportAction,
  generateTestsAction,
  getActiveBodyAction,
  listEvalImportsAction,
  listTestCasesAction,
  nextVersionAction,
  releaseVersionAction,
} from '@/app/builder/actions';
import { useToast } from '@/components/ui/toast';
import type { BuilderSpec, CompiledBody } from '@promptops/builder';
import { type DiffLine, diffLines, diffStats } from '@promptops/diff';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { INPUT_CLS, LABEL_CLS } from './fields';

const BTN =
  'inline-flex items-center justify-center h-8 px-3.5 text-sm font-medium rounded-md bg-accent text-accent-fg hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none';

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="text-muted text-xs mt-1">{desc}</p>
    </div>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  if (!text?.trim()) return null;
  return (
    <div>
      <div className="text-xs text-muted mb-1.5">{label}</div>
      <pre className="rounded-md border border-border bg-surface-2 p-3 text-xs text-text whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
        {text}
      </pre>
    </div>
  );
}

// ── Step 5: Preview ─────────────────────────────────────────────────────────

export function StepPreview({ assetId, spec }: { assetId: string; spec: BuilderSpec }) {
  const [body, setBody] = useState<CompiledBody | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    compileSpecAction(assetId, spec).then((r) => {
      if (!live) return;
      if (r.body) setBody(r.body);
      else setErr(r.error ?? 'compile failed');
    });
    return () => {
      live = false;
    };
  }, [assetId, spec]);

  return (
    <div className="space-y-4">
      <Header
        title="Prompt Preview"
        desc="Compiled from your spec. This becomes the version body on release."
      />
      {err && <div className="text-danger text-xs">{err}</div>}
      {!body && !err && <div className="text-muted text-xs">Compiling…</div>}
      {body && (
        <div className="space-y-3">
          <Block label="system" text={body.system} />
          <Block label="developer" text={body.developer} />
          <Block label="user" text={body.user} />
          {body.tools.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">tools ({body.tools.length})</div>
              <pre className="rounded-md border border-border bg-surface-2 p-3 text-xs text-text whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                {JSON.stringify(body.tools, null, 2)}
              </pre>
            </div>
          )}
          {body.output_schema != null && (
            <Block label="output_schema" text={JSON.stringify(body.output_schema, null, 2)} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 6: Test Cases ────────────────────────────────────────────────────────

export function StepTests({ assetId }: { assetId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<TestCaseRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => listTestCasesAction(assetId).then(setRows);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const generate = async () => {
    setBusy(true);
    const r = await generateTestsAction(assetId);
    if (r.error) toast(r.error, 'error');
    else toast(`Generated ${r.created ?? 0} test cases`, 'success');
    await load();
    setBusy(false);
  };
  const del = async (tid: string) => {
    await deleteTestCaseAction(assetId, tid);
    await load();
  };

  return (
    <div className="space-y-4">
      <Header
        title="Test Cases"
        desc="Baseline behavioral checks. Generate from spec, then refine."
      />
      <div className="flex items-center gap-3">
        <button type="button" onClick={generate} disabled={busy} className={BTN}>
          {busy ? 'Generating…' : 'Generate from spec'}
        </button>
        <span className="text-xs text-muted">{rows.length} cases</span>
      </div>
      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id} className="border border-border bg-surface rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text">{t.name}</span>
                <span className="text-xs text-muted">{t.source}</span>
              </div>
              <button
                type="button"
                onClick={() => del(t.id)}
                className="text-muted hover:text-danger text-xs transition-colors"
              >
                remove
              </button>
            </div>
            {t.note && <p className="text-muted text-xs mt-1">{t.note}</p>}
          </li>
        ))}
        {rows.length === 0 && <li className="text-muted text-xs">No test cases yet.</li>}
      </ul>
    </div>
  );
}

// ── Step 7: Eval Results ──────────────────────────────────────────────────────

export function StepEval({ assetId }: { assetId: string }) {
  const toast = useToast();
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<EvalImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => listEvalImportsAction(assetId).then(setRows);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const submit = async () => {
    if (!raw.trim()) return;
    setBusy(true);
    setErr(null);
    const r = await evalImportAction(assetId, raw);
    if (r.error) {
      setErr(r.error);
      toast(r.error, 'error');
    } else {
      setRaw('');
      const s = r.row?.summary;
      toast(s ? `Imported — ${s.passed}/${s.total} pass` : 'Eval imported', 'success');
    }
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Header
        title="Eval Results"
        desc="Paste an eval results .txt from the AI Eval tool. PromptOps ingests, does not run evals."
      />
      <div>
        <label className={LABEL_CLS}>Paste eval output</label>
        <textarea
          className={`${INPUT_CLS} font-mono`}
          rows={6}
          value={raw}
          placeholder={
            'PASS 5 / FAIL 1\ncase: happy-path => PASS score 0.93\ncase: guardrail-1 => FAIL score 0.40 reason: ...'
          }
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>
      {err && <div className="text-danger text-xs">{err}</div>}
      <button type="button" onClick={submit} disabled={busy} className={BTN}>
        {busy ? 'Importing…' : 'Import results'}
      </button>

      <div className="space-y-2">
        {rows.map((r) => {
          const rate = Math.round((r.summary.pass_rate ?? 0) * 100);
          return (
            <div key={r.id} className="border border-border bg-surface rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text font-medium">{r.filename ?? 'eval'}</span>
                <span
                  className={rate >= 80 ? 'text-success font-medium' : 'text-warning font-medium'}
                >
                  {r.summary.passed}/{r.summary.total} pass · {rate}%
                </span>
              </div>
              <div className="mt-2 space-y-0.5">
                {r.parsed
                  .filter((c) => c.status === 'fail')
                  .map((c, i) => (
                    <div key={i} className="text-xs text-danger">
                      ✗ {c.name}
                      {c.reason ? ` — ${c.reason}` : ''}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-muted text-xs">No eval imports yet.</div>}
      </div>
    </div>
  );
}

// ── Step 8: Release ─────────────────────────────────────────────────────────

function FieldDiff({ field, before, after }: { field: string; before: string; after: string }) {
  const lines = diffLines(before, after);
  const { added, removed } = diffStats(lines);
  if (added === 0 && removed === 0) {
    return (
      <div className="text-xs">
        <span className="text-muted">{field}</span> <span className="text-muted/60">unchanged</span>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs mb-1">
        <span className="text-text font-medium">{field}</span>{' '}
        <span className="text-success">+{added}</span>{' '}
        <span className="text-danger">-{removed}</span>
      </div>
      <pre className="rounded-md border border-border bg-surface-2 p-2 text-xs font-mono overflow-x-auto leading-relaxed">
        {lines.map((l: DiffLine, i: number) => (
          <div
            key={i}
            className={
              l.type === 'add'
                ? 'bg-success/10 text-success'
                : l.type === 'remove'
                  ? 'bg-danger/10 text-danger'
                  : 'text-muted'
            }
          >
            {l.type === 'add' ? '+ ' : l.type === 'remove' ? '- ' : '  '}
            {l.text}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function StepRelease({ assetId, spec }: { assetId: string; spec: BuilderSpec }) {
  const router = useRouter();
  const toast = useToast();
  const [version, setVersion] = useState('0.1.0');
  const [promote, setPromote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveBody | null>(null);
  const [compiled, setCompiled] = useState<CompiledBody | null>(null);

  // Prefill the next free version label so re-releases don't 409.
  useEffect(() => {
    nextVersionAction(assetId).then(setVersion);
  }, [assetId]);

  // Load active version + compile current spec → diff before release.
  useEffect(() => {
    let live = true;
    getActiveBodyAction(assetId).then((a) => live && setActive(a));
    compileSpecAction(assetId, spec).then((r) => live && r.body && setCompiled(r.body));
    return () => {
      live = false;
    };
  }, [assetId, spec]);

  const release = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const r = await releaseVersionAction(assetId, spec, version.trim(), promote);
    if (r.ok && r.vid) {
      setMsg(`Released ${r.version}. Opening version…`);
      toast(`Released ${r.version}${promote ? ' → active' : ''}`, 'success');
      // Open the created version as its own instance.
      router.push(`/assets/${encodeURIComponent(assetId)}/versions/${r.vid}`);
    } else {
      setErr(r.error ?? 'release failed');
      toast(r.error ?? 'Release failed', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title="Release"
        desc="Compile the spec into a version and optionally promote it to active."
      />
      <div className="max-w-xs">
        <label className={LABEL_CLS}>Version label</label>
        <input
          className={INPUT_CLS}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="0.1.0"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-text">
        <input
          type="checkbox"
          checked={promote}
          onChange={(e) => setPromote(e.target.checked)}
          className="accent-accent"
        />
        Promote to active after creating
      </label>

      {/* Diff vs current active */}
      {compiled && (
        <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
          <div className="text-xs font-medium text-text">
            Changes vs active{' '}
            {active ? (
              <span className="text-muted font-normal">(v{active.version})</span>
            ) : (
              <span className="text-muted font-normal">— first version</span>
            )}
          </div>
          <FieldDiff field="system" before={active?.body.system ?? ''} after={compiled.system} />
          <FieldDiff
            field="developer"
            before={active?.body.developer ?? ''}
            after={compiled.developer}
          />
          <FieldDiff field="user" before={active?.body.user ?? ''} after={compiled.user} />
        </div>
      )}

      {err && <div className="text-danger text-xs">{err}</div>}
      {msg && (
        <div className="text-success text-xs">
          {msg}{' '}
          <a href={`/assets/${encodeURIComponent(assetId)}`} className="underline">
            View asset →
          </a>
        </div>
      )}
      <button type="button" onClick={release} disabled={busy} className={BTN}>
        {busy ? 'Releasing…' : 'Create version'}
      </button>
      <p className="text-muted text-xs">
        Uses the registry: creates a draft version from the compiled prompt, then promotes. Full
        audit + diff available on the asset page.
      </p>
    </div>
  );
}
