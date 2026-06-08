'use client';

import type { VariableContractEntry, Version } from '@/lib/api';
import { useActionState, useCallback, useMemo, useState } from 'react';
import { HighlightedTextarea } from './HighlightedTextarea';
import { createVersionAction } from './actions';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  assetId: string;
  versions: Version[];
  variableContract: VariableContractEntry[];
}

type CheckStatus = 'pass' | 'warn' | 'fail';
interface Check {
  status: CheckStatus;
  label: string;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

const VAR_RE = /\{\{([a-z][a-z0-9_]*)\}\}/gi;

function detectVars(text: string): string[] {
  const matches = [...text.matchAll(VAR_RE)];
  return [...new Set(matches.map((m) => m[1]!.toLowerCase()))];
}

function suggestNext(versions: string[]): string {
  const parsed = versions
    .map((v) => v.match(/^(\d+)\.(\d+)\.(\d+)/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ maj: +m[1]!, min: +m[2]!, pat: +m[3]! }));
  if (!parsed.length) return '0.1.0';
  const max = parsed.reduce((a, b) =>
    a.maj !== b.maj
      ? a.maj > b.maj
        ? a
        : b
      : a.min !== b.min
        ? a.min > b.min
          ? a
          : b
        : a.pat >= b.pat
          ? a
          : b,
  );
  return `${max.maj}.${max.min}.${max.pat + 1}`;
}

function isValidSemver(v: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9][a-zA-Z0-9.-]*)?$/.test(v.trim());
}

function analyzeSystem(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  return {
    roleClarity: /\byou are\b|\bact as\b|\byour role\b|\bas a\b/.test(t),
    safetyGuard: /\bdo not\b|\bnever\b|\bavoid\b|\brefuse\b|\bif asked\b/.test(t),
    outputFormat: /\bjson\b|\bmarkdown\b|\bformat\b|\bbullet\b|\blist\b|\bstructur/.test(t),
    languageRule: /\blanguage\b|\brespond in\b|\bin english\b|\bin spanish\b/.test(t),
  };
}

const CHANGE_TYPES = [
  'Instruction change',
  'Variable change',
  'Output format change',
  'Safety guard',
  'Tone/style change',
  'Regression fix',
] as const;

// ── Shared class constants ────────────────────────────────────────────────────

const INPUT_CLS =
  'w-full bg-surface border border-border text-text text-xs rounded-md px-3 py-2 placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors';

// ── Component ─────────────────────────────────────────────────────────────────

export function NewVersionForm({ assetId, versions, variableContract }: Props) {
  const [version, setVersion] = useState('');
  const [system, setSystem] = useState('');
  const [user, setUser] = useState('');
  const [changelog, setChangelog] = useState('');
  const [changeTypes, setChangeTypes] = useState<Set<string>>(new Set());
  const [varExamples, setVarExamples] = useState<Record<string, string>>({});

  const boundAction = createVersionAction.bind(null, assetId);
  const [state, action, pending] = useActionState(boundAction, null);

  // ── Derived state ────────────────────────────────────────────────────────

  const existingVersions = useMemo(() => versions.map((v) => v.version), [versions]);
  const suggested = useMemo(() => suggestNext(existingVersions), [existingVersions]);
  const semverValid = isValidSemver(version);
  const versionUnique = version.trim() !== '' && !existingVersions.includes(version.trim());
  const matchingVersion = useMemo(
    () => versions.find((v) => v.version === version.trim()) ?? null,
    [versions, version],
  );
  const detectedVars = useMemo(() => detectVars(`${system}\n${user}`), [system, user]);
  const systemAnalysis = useMemo(() => analyzeSystem(system), [system]);
  const missingExamples = detectedVars.filter((v) => !varExamples[v]?.trim());

  const variableContractSnapshot = useMemo(
    () =>
      detectedVars.map((varName) => {
        const existing = variableContract.find((v) => v.name === varName);
        return {
          name: varName,
          kind: existing?.kind ?? 'string',
          required: existing?.required ?? true,
          description: existing?.description ?? '',
          example: varExamples[varName] ?? '',
          ...(existing?.values ? { values: existing.values } : {}),
          ...(existing?.default !== undefined ? { default: existing.default } : {}),
        };
      }),
    [detectedVars, variableContract, varExamples],
  );

  // ── Readiness checks (all computed from real state) ──────────────────────

  const checks = useMemo<Check[]>(() => {
    const vTrimmed = version.trim();
    return [
      {
        status: semverValid ? 'pass' : vTrimmed ? 'fail' : 'fail',
        label: semverValid
          ? 'Version format valid (semver)'
          : vTrimmed
            ? `"${vTrimmed}" is not valid semver`
            : 'Version string required',
      },
      {
        status: !vTrimmed ? 'fail' : versionUnique ? 'pass' : 'fail',
        label: versionUnique
          ? 'Version is unique'
          : vTrimmed
            ? `"${vTrimmed}" already exists`
            : 'Version required',
      },
      {
        status: user.trim() ? 'pass' : 'fail',
        label: user.trim() ? 'User prompt not empty' : 'User prompt is required',
      },
      {
        status: detectedVars.length > 0 ? 'pass' : 'warn',
        label:
          detectedVars.length > 0
            ? `${detectedVars.length} variable(s) detected`
            : 'No {{variables}} in prompt',
      },
      ...(detectedVars.length > 0
        ? [
            {
              status: (missingExamples.length === 0 ? 'pass' : 'warn') as CheckStatus,
              label:
                missingExamples.length > 0
                  ? `Missing example values: ${missingExamples.join(', ')}`
                  : 'All variables have example values',
            },
          ]
        : []),

      {
        status: changelog.trim() ? 'pass' : 'warn',
        label: changelog.trim() ? 'Changelog written' : 'Changelog is empty',
      },
    ];
  }, [version, semverValid, versionUnique, user, detectedVars, missingExamples, changelog]);

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const canSave = semverValid && versionUnique && user.trim().length > 0;

  const toggleChangeType = useCallback((type: string) => {
    setChangeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <a href={`/assets/${encodeURIComponent(assetId)}`} className="hover:text-text">
            {assetId}
          </a>
          <span>/</span>
          <span className="text-text">new version</span>
        </div>
        <h1 className="text-lg font-semibold text-text">Create version</h1>
        <p className="text-muted text-xs mt-1">Creates a draft. Promote to active after testing.</p>
      </div>

      {state?.error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-md text-xs mb-5">
          {state.error}
        </div>
      )}

      <form action={action}>
        {/* Hidden: variable contract snapshot + change types */}
        <input
          type="hidden"
          name="variable_contract_snapshot"
          value={JSON.stringify(variableContractSnapshot)}
        />
        <input type="hidden" name="change_types" value={JSON.stringify([...changeTypes])} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: form ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Version */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="version" className="text-xs text-muted">
                  Version string <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setVersion(suggested)}
                  className="text-xs text-accent hover:opacity-80 transition-colors"
                >
                  suggest: {suggested}
                </button>
              </div>
              <input
                id="version"
                name="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder={suggested}
                className={`${INPUT_CLS} ${
                  version && !semverValid
                    ? 'border-danger/50 focus:border-danger'
                    : version && semverValid && !versionUnique
                      ? 'border-warning/50 focus:border-warning'
                      : ''
                }`}
                spellCheck={false}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-muted text-xs">Semantic versioning: major.minor.patch</p>
                {version && !semverValid && (
                  <span className="text-danger text-xs">invalid format</span>
                )}
                {version && semverValid && versionUnique && (
                  <span className="text-success text-xs">✓ unique</span>
                )}
              </div>
              {version && semverValid && matchingVersion && (
                <div className="mt-2 bg-surface border border-border rounded-md px-3 py-2 text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">v{matchingVersion.version}</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">{matchingVersion.state}</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">{matchingVersion.author}</span>
                  </div>
                  {matchingVersion.changelog && (
                    <p className="text-muted leading-relaxed">{matchingVersion.changelog}</p>
                  )}
                </div>
              )}
            </div>

            {/* System prompt */}
            <div>
              <label className="block text-xs text-muted mb-1.5">System prompt</label>
              <HighlightedTextarea
                name="system"
                value={system}
                onChange={setSystem}
                rows={4}
                placeholder="You are a concise assistant that writes email subject lines…"
              />
            </div>

            {/* User prompt */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                User prompt <span className="text-danger">*</span>
              </label>
              <HighlightedTextarea
                name="user"
                value={user}
                onChange={setUser}
                rows={6}
                placeholder="Write an email subject line for {{user_product_name}} with {{context_tone}} tone."
                required
              />
              <p className="text-muted text-xs mt-1">
                {'Use {{variable_name}} for interpolated variables.'}
              </p>
            </div>

            {/* Changelog — prominent */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <label className="block text-xs font-medium text-text mb-2">What changed?</label>
              <textarea
                name="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={3}
                placeholder="Describe what changed and why this version exists…"
                className="w-full bg-surface-2 border border-border text-text text-xs rounded-md px-3 py-2 placeholder:text-muted/60 focus:outline-none focus:border-accent/50 resize-none"
              />
              <div className="mt-3">
                <p className="text-xs text-muted mb-2">Change type:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {CHANGE_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={changeTypes.has(type)}
                        onChange={() => toggleChangeType(type)}
                        className="accent-accent w-3 h-3"
                      />
                      <span
                        className={`text-xs ${
                          changeTypes.has(type) ? 'text-accent' : 'text-muted'
                        }`}
                      >
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Readiness checklist */}
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-text">Readiness checks</h3>
                <span className="text-xs text-muted">
                  {passCount}/{checks.length} passing
                </span>
              </div>
              <div className="space-y-1.5">
                {checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {check.status === 'pass' ? (
                      <span className="text-success shrink-0 mt-px">✓</span>
                    ) : check.status === 'warn' ? (
                      <span className="text-warning shrink-0 mt-px">⚠</span>
                    ) : (
                      <span className="text-danger shrink-0 mt-px">✗</span>
                    )}
                    <span
                      className={
                        check.status === 'pass'
                          ? 'text-text'
                          : check.status === 'warn'
                            ? 'text-warning/70'
                            : 'text-muted'
                      }
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                name="intent"
                value="save"
                disabled={pending || !canSave}
                className="px-4 py-2 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
              >
                {pending ? 'Creating…' : 'Save draft'}
              </button>
              <a
                href={`/assets/${encodeURIComponent(assetId)}`}
                className="text-xs text-muted hover:text-text"
              >
                Cancel
              </a>
            </div>
          </div>

          {/* ── Right: analysis panels ────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            {/* System prompt analysis */}
            {systemAnalysis && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">
                  System prompt
                </h3>
                <div className="space-y-2">
                  {(
                    [
                      { key: 'roleClarity', label: 'Role clarity' },
                      { key: 'safetyGuard', label: 'Safety guard' },
                      { key: 'outputFormat', label: 'Output format' },
                      { key: 'languageRule', label: 'Language rule' },
                    ] as const
                  ).map(({ key, label }) => {
                    const detected = systemAnalysis[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted">{label}</span>
                        <span className={detected ? 'text-success' : 'text-muted'}>
                          {detected ? '✓ detected' : '— missing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variable inspector */}
            {detectedVars.length > 0 && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">
                  Detected variables{' '}
                  <span className="text-muted font-normal normal-case tracking-normal">
                    ({detectedVars.length})
                  </span>
                </h3>
                <div className="space-y-4">
                  {detectedVars.map((varName, i) => {
                    const contract = variableContract.find((v) => v.name === varName);
                    return (
                      <div key={varName}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-accent text-xs font-mono font-medium">
                            {i + 1}. {varName}
                          </span>
                          {!contract && <span className="text-warning text-xs">undeclared</span>}
                        </div>
                        <div className="ml-3 space-y-1 text-xs mb-2">
                          <div className="flex justify-between">
                            <span className="text-muted">Type</span>
                            <span className="text-muted">{contract?.kind ?? 'string'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Required</span>
                            <span className="text-muted">
                              {contract?.required !== false ? 'yes' : 'no'}
                            </span>
                          </div>
                          {contract?.values && (
                            <div className="flex justify-between gap-4">
                              <span className="text-muted shrink-0">Values</span>
                              <span className="text-muted text-right font-mono">
                                {contract.values.join(', ')}
                              </span>
                            </div>
                          )}
                          {contract?.default !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted">Default</span>
                              <span className="text-muted font-mono">
                                {String(contract.default)}
                              </span>
                            </div>
                          )}
                          {!!contract?.description && (
                            <p className="text-muted pt-0.5 leading-relaxed">
                              {contract.description}
                            </p>
                          )}
                        </div>
                        <input
                          type="text"
                          value={varExamples[varName] ?? ''}
                          onChange={(e) =>
                            setVarExamples((prev) => ({ ...prev, [varName]: e.target.value }))
                          }
                          placeholder={contract?.values ? contract.values[0] : '+ example value'}
                          className="ml-3 w-[calc(100%-0.75rem)] bg-surface border border-border text-text text-xs rounded-md px-2 py-1.5 placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User prompt variable hint (when user prompt has no vars yet) */}
            {!system.trim() && detectedVars.length === 0 && (
              <div className="border border-dashed border-border rounded-lg p-4">
                <p className="text-muted text-xs text-center leading-relaxed">
                  Analysis panels appear as you write.
                  <br />
                  Use <span className="text-accent font-mono">{'{{variable}}'}</span> in prompts.
                </p>
              </div>
            )}

            {/* Variables hint when only user has vars but no system */}
            {!system.trim() && detectedVars.length > 0 && (
              <div className="border border-dashed border-border rounded-lg p-3">
                <p className="text-muted text-xs text-center">
                  Add a system prompt to see role/safety analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
