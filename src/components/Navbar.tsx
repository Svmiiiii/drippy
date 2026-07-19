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
        <span className="font-heading text-xl sm:text-3xl tracking-widest gradient-text">DRIPPY</span>
      </Link>
      <div className="flex items-center gap-0.5 sm:gap-2">
        <Link href="/shop" className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-text-secondary hover:text-white transition">{t('collection')}</Link>
        {profile ? (
          <>
            <Link href={profile.role === 'customer' ? '/dashboard' : '/admin'}
              className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-text-secondary hover:text-white transition">
              {t('mySpace')}
            </Link>
            <form action={logout}>
              <button className="btn-secondary !px-3 sm:!px-4 !py-2 !text-[12px] sm:!text-[13px]">{t('logout')}</button>
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
