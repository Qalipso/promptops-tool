'use client';

import { cn } from '@/lib/cn';
import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const TONE_CLS: Record<Tone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-border bg-surface text-text',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn('rounded-md border px-3.5 py-2.5 text-xs shadow-md', TONE_CLS[t.tone])}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
