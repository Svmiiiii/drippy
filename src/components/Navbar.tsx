import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getAuthProfile } from '@/lib/auth';
import { logout } from '@/lib/actions';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CartLink } from './CartLink';

export async function Navbar() {
  const { profile } = await getAuthProfile();
  const t = await getTranslations('nav');

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 sm:px-6 py-4 bg-bg/80 backdrop-blur-xl border-b border-border">
      <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/icon-original.png" alt="" className="h-7 sm:h-9 w-auto" />
        <span className="font-heading text-xl sm:text-3xl tracking-widest gradient-text">DROPIX</span>
      </Link>
      <div className="flex items-center gap-0.5 sm:gap-2">
        <Link href="/shop" className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-text-secondary hover:text-white transition">{t('collection')}</Link>
        {profile ? (
          <>
            <Link href={profile.role === 'customer' ? '/dashboard' : '/admin'}
              aria-label={t('mySpace')} title={t('mySpace')}
              className="p-2 sm:px-4 text-text-secondary hover:text-white transition">
              <span className="hidden sm:inline text-sm">{t('mySpace')}</span>
              <svg className="sm:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
            </Link>
            <form action={logout}>
              <button aria-label={t('logout')} title={t('logout')} className="btn-secondary !p-2 sm:!px-4 sm:!py-2 !text-[12px] sm:!text-[13px]">
                <span className="hidden sm:inline">{t('logout')}</span>
                <svg className="sm:hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn-primary !px-3 sm:!px-4 !py-2 !text-[12px] sm:!text-[13px]">{t('login')}</Link>
        )}
        <CartLink />
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
