import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// ── Button ──────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90 shadow-sm',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-border/40',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
};
const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-md gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  hover,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-sm',
        hover && 'transition-shadow hover:shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success/10 text-success border-transparent',
  warning: 'bg-warning/10 text-warning border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Map lifecycle/version state → badge tone. */
export function stateTone(state: string): Tone {
  switch (state) {
    case 'active':
      return 'success';
    case 'draft':
      return 'warning';
    case 'deprecated':
    case 'sunset':
    case 'archived':
      return 'neutral';
    default:
      return 'neutral';
  }
}

// ── Field primitives ─────────────────────────────────────────────────────────

export const inputClass = cn(
  'w-full rounded-md border border-border bg-surface text-text text-sm px-3 py-2',
  'placeholder:text-muted/60 transition-colors',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/50',
);

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted mb-1.5">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-muted/70 mt-1">{hint}</p>}
    </div>
  );
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        'rounded-md border border-border bg-surface-2 p-3 text-xs text-text',
        'whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto',
        className,
      )}
    >
      {children}
    </pre>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {desc && <p className="text-xs text-muted mt-1">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted/30 border-t-accent',
        className,
      )}
      aria-label="loading"
    />
  );
}
