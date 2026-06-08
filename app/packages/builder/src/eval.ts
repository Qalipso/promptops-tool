/**
 * parseEval — lenient parser for an eval results .txt exported from the
 * AI Eval tool. PromptOps does not run evals; it ingests their output.
 *
 * Recognized (case-insensitive, whitespace-tolerant) per-case lines:
 *   case: <name> => PASS score 0.92
 *   <name>: FAIL score 0.41 reason: dropped slot
 *   [PASS] happy-path (0.9)
 * Anything unparsed is ignored. Totals are derived from parsed cases,
 * and overridden by an explicit summary line if present:
 *   PASS 12 / FAIL 3
 */

export type CaseStatus = 'pass' | 'fail';

export interface EvalCase {
  name: string;
  status: CaseStatus;
  score?: number;
  reason?: string;
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  cases: EvalCase[];
}

const STATUS_RE = /\b(PASS|FAIL)\b/i;
const SCORE_RE = /score[:\s]+([0-9]*\.?[0-9]+)/i;
const REASON_RE = /reason[:\s]+(.+)$/i;
const SUMMARY_RE = /PASS\s+(\d+)\s*\/\s*FAIL\s+(\d+)/i;

function extractName(line: string): string | null {
  // "case: NAME => ..." or "NAME: PASS ..." or "[PASS] NAME (...)"
  const caseKw = line.match(/case[:\s]+([^=]+?)\s*=>/i);
  if (caseKw?.[1]) return caseKw[1].trim();

  const bracket = line.match(/\[(?:PASS|FAIL)\]\s+([^\s(]+)/i);
  if (bracket?.[1]) return bracket[1].trim();

  const leading = line.match(/^([\w.\-/]+)\s*[:=]/);
  if (leading?.[1]) return leading[1].trim();

  return null;
}

export function parseEval(raw: string): EvalSummary {
  const lines = raw.split('\n');
  const cases: EvalCase[] = [];
  let summaryLine: { passed: number; failed: number } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sum = line.match(SUMMARY_RE);
    if (sum && !line.match(/=>/)) {
      summaryLine = { passed: Number(sum[1]), failed: Number(sum[2]) };
      continue;
    }

    const status = line.match(STATUS_RE);
    const name = extractName(line);
    if (!status || !name) continue;

    const score = line.match(SCORE_RE);
    const reason = line.match(REASON_RE);
    const c: EvalCase = {
      name,
      status: status[1]?.toLowerCase() === 'pass' ? 'pass' : 'fail',
    };
    if (score?.[1]) c.score = Number(score[1]);
    if (reason?.[1]) c.reason = reason[1].trim();
    cases.push(c);
  }

  const passed = summaryLine?.passed ?? cases.filter((c) => c.status === 'pass').length;
  const failed = summaryLine?.failed ?? cases.filter((c) => c.status === 'fail').length;
  const total = summaryLine ? passed + failed : cases.length;
  const pass_rate = total > 0 ? passed / total : 0;

  return { total, passed, failed, pass_rate, cases };
}
