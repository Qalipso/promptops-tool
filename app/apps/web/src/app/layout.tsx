import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PromptOps',
  description: 'Prompt testing & versioning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <a href="/" className="text-white font-bold tracking-tight no-underline text-sm">
            PromptOps
          </a>
          <nav className="flex items-center gap-4 text-xs">
            <a href="/" className="text-gray-400 hover:text-white transition-colors">
              Assets
            </a>
            <a href="/docs" className="text-gray-400 hover:text-white transition-colors">
              API Docs
            </a>
          </nav>
          <div className="ml-auto">
            <a
              href="/assets/new"
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded transition-colors no-underline"
            >
              + New Asset
            </a>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
