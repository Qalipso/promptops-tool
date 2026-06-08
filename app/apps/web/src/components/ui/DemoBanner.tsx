import { IS_DEMO } from '@/lib/demo';

/** Thin read-only banner shown only on the public demo deployment. */
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="border-b border-border bg-accent-soft text-accent px-6 py-1.5 text-center text-xs">
      Read-only demo — sample data, write actions disabled.{' '}
      <a
        href="https://github.com/Qalipso/promptops-tool"
        className="underline"
        target="_blank"
        rel="noreferrer"
      >
        Run it locally
      </a>{' '}
      for the full builder.
    </div>
  );
}
