import { DemoBanner } from '@/components/ui/DemoBanner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ToastProvider } from '@/components/ui/toast';
import { IS_DEMO } from '@/lib/demo';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'PromptOps',
  description: 'Prompt testing & versioning',
};

// Set theme class before paint to avoid flash of wrong theme.
const NO_FLASH = `
(function(){try{
  var t = localStorage.getItem('promptops-theme');
  if(!t){ t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  if(t === 'dark'){ document.documentElement.classList.add('dark'); }
}catch(e){ document.documentElement.classList.add('dark'); }})();
`;

const navLink = 'text-muted hover:text-text transition-colors';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static no-flash theme script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-screen">
        <DemoBanner />
        <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur px-6 py-3 flex items-center gap-6">
          <a href="/" className="text-text font-semibold tracking-tight no-underline text-sm">
            PromptOps
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="/" className={navLink}>
              Assets
            </a>
            {!IS_DEMO && (
              <a href="/builder/new" className={navLink}>
                Builder
              </a>
            )}
            <a href="/docs" className={navLink}>
              API Docs
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {!IS_DEMO && (
              <a
                href="/assets/new"
                className="px-3 py-1.5 bg-accent hover:opacity-90 text-accent-fg text-sm rounded-md transition-opacity no-underline"
              >
                + New Asset
              </a>
            )}
          </div>
        </header>
        <ToastProvider>
          <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
