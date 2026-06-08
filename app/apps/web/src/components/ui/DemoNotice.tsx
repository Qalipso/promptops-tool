import { EmptyState } from './index';

/** Shown in place of write-only surfaces (builder, create forms) on the demo. */
export function DemoNotice({ feature }: { feature: string }) {
  return (
    <EmptyState
      title={`${feature} is disabled in the demo`}
      desc="The public demo is read-only. Clone and run locally with `pnpm start:local` to use it."
      action={
        <a href="/" className="text-xs text-accent hover:opacity-80">
          ← Back to assets
        </a>
      }
    />
  );
}
