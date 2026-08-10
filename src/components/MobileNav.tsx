'use client';
import { useState } from 'react';
import Link from 'next/link';

interface NavLink { href: string; label: string; icon: string; badge?: number }

// Admin and customer-dashboard layouts render their nav as a fixed sidebar
// that's `hidden` below the md breakpoint with no mobile equivalent — so the
// entire section was unreachable on a phone. This is the mobile counterpart:
// same links, same footer, just a hamburger + full-screen drawer instead of
// a permanent sidebar.
export function MobileNav({ links, subtitle, footer }: { links: NavLink[]; subtitle: string; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg sticky top-0 z-40">
        <Link href="/" className="font-heading text-2xl gradient-text">DROPIX</Link>
        <button onClick={() => setOpen(true)} aria-label="Menu" className="text-white p-2 -me-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-bg flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <Link href="/" className="font-heading text-2xl gradient-text" onClick={() => setOpen(false)}>DROPIX</Link>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-white p-2 -me-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-primary mb-6 font-semibold tracking-wide">{subtitle}</p>
          <nav className="flex flex-col gap-1 flex-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-base text-text-secondary hover:text-white hover:bg-surface-hover transition">
                <span>{l.icon}</span> {l.label}
                {!!l.badge && (
                  <span className="ms-auto bg-gradient-neon text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {l.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border pt-4">{footer}</div>
        </div>
      )}
    </div>
  );
}
