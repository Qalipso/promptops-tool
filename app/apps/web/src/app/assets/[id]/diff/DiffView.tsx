'use client';

import { diffLines, collapseEqual, type CollapsedLine } from '@/lib/diff';

interface DiffSectionProps {
  label: string;
  a: string;
  b: string;
  v1Label: string;
  v2Label: string;
}

function DiffSection({ label, a, b, v1Label, v2Label }: DiffSectionProps) {
  const lines = diffLines(a, b);
  const collapsed = collapseEqual(lines, 3);
  const hasChanges = lines.some((l) => l.type !== 'equal');

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {label}
        </h3>
        {!hasChanges && (
          <span className="text-xs text-zinc-500 font-mono">no changes</span>
        )}
      </div>

      {hasChanges ? (
        <div className="grid grid-cols-2 gap-1 font-mono text-xs leading-5">
          {/* Column headers */}
          <div className="text-zinc-500 px-3 py-1 border-b border-zinc-700">
            {v1Label}
          </div>
          <div className="text-zinc-500 px-3 py-1 border-b border-zinc-700">
            {v2Label}
          </div>

          {/* Diff rows */}
          {renderSideBySide(collapsed)}
        </div>
      ) : (
        <pre className="text-xs font-mono text-zinc-500 bg-zinc-900 rounded px-4 py-3 whitespace-pre-wrap border border-zinc-800">
          {a || '(empty)'}
        </pre>
      )}
    </div>
  );
}

/**
 * Convert a flat CollapsedLine[] into paired left/right cells for a 2-col grid.
 * equal lines appear in both columns; add only in right; remove only in left.
 */
function renderSideBySide(lines: CollapsedLine[]): React.ReactNode[] {
  const cells: React.ReactNode[] = [];
  let key = 0;

  // Group consecutive add/remove pairs to align them
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (line.type === 'collapsed') {
      cells.push(
        <div key={key++} className="col-span-2 text-center text-zinc-600 py-1 border-y border-zinc-800 text-[11px]">
          ... {line.count} unchanged lines ...
        </div>,
      );
      i++;
      continue;
    }

    if (line.type === 'equal') {
      const cls = 'bg-zinc-900 px-3 py-0.5 text-zinc-400 whitespace-pre-wrap';
      cells.push(<div key={key++} className={cls}>{line.text || '\u00a0'}</div>);
      cells.push(<div key={key++} className={cls}>{line.text || '\u00a0'}</div>);
      i++;
      continue;
    }

    // Collect consecutive removes + adds to pair them
    const removes: string[] = [];
    const adds: string[] = [];
    while (i < lines.length) {
      const l = lines[i]!;
      if (l.type === 'remove') { removes.push(l.text); i++; }
      else if (l.type === 'add') { adds.push(l.text); i++; }
      else break;
    }

    const maxLen = Math.max(removes.length, adds.length);
    for (let r = 0; r < maxLen; r++) {
      const rem = removes[r];
      const add = adds[r];
      cells.push(
        <div key={key++} className="bg-red-950/50 border-l-2 border-red-700 px-3 py-0.5 text-red-300 whitespace-pre-wrap">
          {rem ?? '\u00a0'}
        </div>,
      );
      cells.push(
        <div key={key++} className="bg-green-950/50 border-l-2 border-green-700 px-3 py-0.5 text-green-300 whitespace-pre-wrap">
          {add ?? '\u00a0'}
        </div>,
      );
    }
  }

  return cells;
}

interface DiffViewProps {
  v1: {
    id: string;
    version: string;
    systemPrompt: string;
    userPrompt: string;
    variableContract: string;
    modelConfig: string;
    changelog: string;
  };
  v2: {
    id: string;
    version: string;
    systemPrompt: string;
    userPrompt: string;
    variableContract: string;
    modelConfig: string;
    changelog: string;
  };
}

export function DiffView({ v1, v2 }: DiffViewProps) {
  if (v1.id === v2.id) {
    return (
      <div className="rounded border border-yellow-700/40 bg-yellow-900/20 px-5 py-4 text-yellow-300 text-sm">
        Same version selected on both sides — no differences to show.
      </div>
    );
  }

  return (
    <div>
      <DiffSection label="System Prompt" a={v1.systemPrompt} b={v2.systemPrompt} v1Label={v1.version} v2Label={v2.version} />
      <DiffSection label="User Prompt" a={v1.userPrompt} b={v2.userPrompt} v1Label={v1.version} v2Label={v2.version} />
      <DiffSection label="Variable Contract" a={v1.variableContract} b={v2.variableContract} v1Label={v1.version} v2Label={v2.version} />
      <DiffSection label="Model Config" a={v1.modelConfig} b={v2.modelConfig} v1Label={v1.version} v2Label={v2.version} />
      <DiffSection label="Changelog" a={v1.changelog} b={v2.changelog} v1Label={v1.version} v2Label={v2.version} />
    </div>
  );
}
