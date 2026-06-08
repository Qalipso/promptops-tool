'use client';

import { saveSpecAction } from '@/app/builder/actions';
import type { BuilderSpec, ToolDef, ToolParam, ToolParamType } from '@promptops/builder';
import { useCallback, useEffect, useRef, useState } from 'react';
import { INPUT_CLS, StringListEditor, TextArea, TextField } from './fields';
import { StepEval, StepPreview, StepRelease, StepTests } from './steps5to8';

const STEPS = [
  { key: 'brief', label: 'Business Brief' },
  { key: 'behavior', label: 'Agent Behavior' },
  { key: 'rules', label: 'Rules' },
  { key: 'tools', label: 'Tools' },
  { key: 'preview', label: 'Prompt Preview' },
  { key: 'tests', label: 'Test Cases' },
  { key: 'eval', label: 'Eval Results' },
  { key: 'release', label: 'Release' },
] as const;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function BuilderWizard({
  assetId,
  initialSpec,
}: {
  assetId: string;
  initialSpec: BuilderSpec;
}) {
  const [spec, setSpec] = useState<BuilderSpec>(initialSpec);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<SaveState>('idle');
  const firstRender = useRef(true);

  // Debounced autosave on spec change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSave('saving');
    const t = setTimeout(async () => {
      const res = await saveSpecAction(assetId, spec);
      setSave(res.ok ? 'saved' : 'error');
    }, 700);
    return () => clearTimeout(t);
  }, [spec, assetId]);

  const update = useCallback((patch: Partial<BuilderSpec>) => {
    setSpec((s) => ({ ...s, ...patch }));
  }, []);

  const current = STEPS[step]?.key;

  return (
    <div className="flex gap-8">
      {/* Step nav */}
      <nav className="w-48 shrink-0">
        <ol className="space-y-1">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  i === step
                    ? 'bg-accent-soft text-accent border border-accent/30'
                    : 'text-muted hover:text-text hover:bg-surface-2 border border-transparent'
                }`}
              >
                <span className="text-muted/60 mr-2">{i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 px-3 text-xs">
          {save === 'saving' && <span className="text-muted">saving…</span>}
          {save === 'saved' && <span className="text-success">saved</span>}
          {save === 'error' && <span className="text-danger">save failed</span>}
        </div>
      </nav>

      {/* Step panel */}
      <div className="flex-1 min-w-0 max-w-2xl">
        {current === 'brief' && <StepBrief spec={spec} update={update} />}
        {current === 'behavior' && <StepBehavior spec={spec} update={update} />}
        {current === 'rules' && <StepRules spec={spec} update={update} />}
        {current === 'tools' && <StepTools spec={spec} update={update} />}
        {current === 'preview' && <StepPreview assetId={assetId} spec={spec} />}
        {current === 'tests' && <StepTests assetId={assetId} />}
        {current === 'eval' && <StepEval assetId={assetId} />}
        {current === 'release' && <StepRelease assetId={assetId} spec={spec} />}

        {/* Step controls */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40 transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-muted">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="px-4 py-1.5 bg-accent hover:opacity-90 disabled:opacity-50 text-accent-fg text-xs rounded-md shadow-sm transition-all"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

type StepProps = { spec: BuilderSpec; update: (patch: Partial<BuilderSpec>) => void };

function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="text-muted text-xs mt-1">{desc}</p>
    </div>
  );
}

function StepBrief({ spec, update }: StepProps) {
  const b = spec.brief;
  const set = (patch: Partial<BuilderSpec['brief']>) => update({ brief: { ...b, ...patch } });
  return (
    <div className="space-y-4">
      <StepHeader title="Business Brief" desc="What the agent is and the job it does." />
      <TextField
        label="Agent name"
        value={b.name}
        onChange={(v) => set({ name: v })}
        placeholder="Booking Assistant"
      />
      <TextField
        label="Purpose"
        value={b.purpose}
        onChange={(v) => set({ purpose: v })}
        placeholder="Book salon appointments via chat."
      />
      <TextField
        label="Audience"
        value={b.audience ?? ''}
        onChange={(v) => set({ audience: v })}
        placeholder="salon clients"
      />
      <TextArea
        label="Context"
        value={b.context ?? ''}
        onChange={(v) => set({ context: v })}
        placeholder="Business hours, services, constraints the agent should know…"
        rows={5}
      />
    </div>
  );
}

function StepBehavior({ spec, update }: StepProps) {
  const be = spec.behavior;
  const set = (patch: Partial<BuilderSpec['behavior']>) =>
    update({ behavior: { ...be, ...patch } });
  return (
    <div className="space-y-4">
      <StepHeader title="Agent Behavior" desc="Persona, tone, language, and hard guardrails." />
      <TextField
        label="Persona"
        value={be.persona}
        onChange={(v) => set({ persona: v })}
        placeholder="a friendly, efficient booking assistant"
      />
      <StringListEditor
        label="Tone"
        items={be.tone}
        onChange={(tone) => set({ tone })}
        placeholder="friendly, concise…"
      />
      <TextField
        label="Language"
        value={be.language ?? ''}
        onChange={(v) => set({ language: v })}
        placeholder="English"
      />
      <StringListEditor
        label="Guardrails (never do)"
        items={be.guardrails}
        onChange={(guardrails) => set({ guardrails })}
        placeholder="never confirm a slot outside opening hours"
      />
    </div>
  );
}

function StepRules({ spec, update }: StepProps) {
  const r = spec.rules;
  const setRule = (i: number, patch: Partial<{ when: string; then: string }>) => {
    const items = r.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    update({ rules: { ...r, items } });
  };
  const addRule = () => update({ rules: { ...r, items: [...r.items, { when: '', then: '' }] } });
  const removeRule = (i: number) =>
    update({ rules: { ...r, items: r.items.filter((_, idx) => idx !== i) } });

  return (
    <div className="space-y-4">
      <StepHeader title="Rules" desc="Conditional behavior (when → then) and global constraints." />
      <div className="space-y-3">
        {r.items.map((it, i) => (
          <div key={i} className="border border-border bg-surface rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Rule {i + 1}</span>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-muted hover:text-danger text-xs transition-colors"
              >
                remove
              </button>
            </div>
            <input
              className={INPUT_CLS}
              placeholder="When… (e.g. the client gives no date)"
              value={it.when}
              onChange={(e) => setRule(i, { when: e.target.value })}
            />
            <input
              className={INPUT_CLS}
              placeholder="Then… (e.g. ask for a preferred date)"
              value={it.then}
              onChange={(e) => setRule(i, { then: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addRule}
          className="px-3 py-1.5 bg-surface-2 border border-border hover:bg-border/40 text-text text-xs rounded-md transition-colors"
        >
          + Add rule
        </button>
      </div>
      <StringListEditor
        label="Constraints (always apply)"
        items={r.constraints}
        onChange={(constraints) => update({ rules: { ...r, constraints } })}
        placeholder="always confirm name and phone"
      />
    </div>
  );
}

const PARAM_TYPES: ToolParamType[] = ['string', 'number', 'boolean', 'enum'];

function StepTools({ spec, update }: StepProps) {
  const tools = spec.tools;
  const setTool = (i: number, patch: Partial<ToolDef>) =>
    update({ tools: tools.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  const addTool = () => update({ tools: [...tools, { name: '', description: '', params: [] }] });
  const removeTool = (i: number) => update({ tools: tools.filter((_, idx) => idx !== i) });

  const addParam = (ti: number) => {
    const t = tools[ti]!;
    const p: ToolParam = { name: '', type: 'string', required: false };
    setTool(ti, { params: [...t.params, p] });
  };
  const setParam = (ti: number, pi: number, patch: Partial<ToolParam>) => {
    const t = tools[ti]!;
    setTool(ti, { params: t.params.map((p, idx) => (idx === pi ? { ...p, ...patch } : p)) });
  };
  const removeParam = (ti: number, pi: number) => {
    const t = tools[ti]!;
    setTool(ti, { params: t.params.filter((_, idx) => idx !== pi) });
  };

  return (
    <div className="space-y-4">
      <StepHeader title="Tools" desc="External actions the agent may call. Optional." />
      <div className="space-y-3">
        {tools.map((t, ti) => (
          <div key={ti} className="border border-border bg-surface rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Tool {ti + 1}</span>
              <button
                type="button"
                onClick={() => removeTool(ti)}
                className="text-muted hover:text-danger text-xs transition-colors"
              >
                remove
              </button>
            </div>
            <input
              className={INPUT_CLS}
              placeholder="tool_name (e.g. check_availability)"
              value={t.name}
              onChange={(e) => setTool(ti, { name: e.target.value })}
            />
            <input
              className={INPUT_CLS}
              placeholder="What the tool does"
              value={t.description}
              onChange={(e) => setTool(ti, { description: e.target.value })}
            />
            <div className="pl-2 border-l border-border space-y-2">
              {t.params.map((p, pi) => (
                <div key={pi} className="flex gap-2 items-center">
                  <input
                    className={`${INPUT_CLS} flex-1`}
                    placeholder="param"
                    value={p.name}
                    onChange={(e) => setParam(ti, pi, { name: e.target.value })}
                  />
                  <select
                    className={`${INPUT_CLS} w-24`}
                    value={p.type}
                    onChange={(e) => setParam(ti, pi, { type: e.target.value as ToolParamType })}
                  >
                    {PARAM_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={p.required}
                      onChange={(e) => setParam(ti, pi, { required: e.target.checked })}
                    />
                    req
                  </label>
                  <button
                    type="button"
                    onClick={() => removeParam(ti, pi)}
                    className="text-muted hover:text-danger text-xs transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addParam(ti)}
                className="text-xs text-muted hover:text-text transition-colors"
              >
                + param
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addTool}
          className="px-3 py-1.5 bg-surface-2 border border-border hover:bg-border/40 text-text text-xs rounded-md transition-colors"
        >
          + Add tool
        </button>
      </div>
    </div>
  );
}
