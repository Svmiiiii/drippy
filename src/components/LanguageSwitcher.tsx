'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LOCALE_COOKIE, type Locale } from '@/lib/locale-config';

const LANGS: { code: Locale; label: string; name: string }[] = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
];

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function change(code: Locale) {
    if (code === locale) { setOpen(false); return; }
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    startTransition(() => router.refresh());
  }

  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className={`flex items-center gap-1 text-text-secondary hover:text-white transition disabled:opacity-50 ${variant === 'compact' ? 'text-xs px-2 py-1.5' : 'text-sm px-3 py-2'}`}
      >
        {pending ? '…' : current.label} <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 bg-surface border border-border rounded-xl overflow-hidden z-50 min-w-[140px] shadow-glow-sm">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              className={`block w-full text-start px-4 py-2.5 text-sm hover:bg-surface-hover transition ${l.code === locale ? 'text-primary font-semibold' : 'text-text-secondary'}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
