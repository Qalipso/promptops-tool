import { notFound } from 'next/navigation';
import { api } from '@/lib/api';

export default async function RunsRemovedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  const asset = await api.asset(assetId).catch(() => null);
  if (!asset) notFound();

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <a href="/" className="hover:text-gray-300">assets</a>
        <span>/</span>
        <a href={`/assets/${encodeURIComponent(assetId)}`} className="hover:text-gray-300">{assetId}</a>
        <span>/</span>
        <span className="text-gray-300">runs</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 space-y-3">
        <h1 className="text-base font-semibold text-white">Test runs removed</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Test runs were removed from PromptOps. PromptOps stores prompt versions and validates
          template rendering — it does not evaluate model output.
        </p>
        <ul className="text-sm text-gray-400 space-y-1.5 list-disc list-inside">
          <li>
            To preview how a version renders with your inputs, use{' '}
            <strong className="text-gray-200">Render Preview</strong> on the version detail page.
          </li>
          <li>
            To evaluate model output quality, use{' '}
            <strong className="text-gray-200">AI Eval</strong>.
          </li>
        </ul>
        <div className="pt-1 flex gap-4 text-xs">
          <a
            href={`/assets/${encodeURIComponent(assetId)}`}
            className="text-indigo-400 hover:text-indigo-300"
          >
            &larr; Back to asset
          </a>
        </div>
      </div>
    </div>
  );
}
