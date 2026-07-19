'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCart } from './CartProvider';

export function CartLink() {
  const { count } = useCart();
  const t = useTranslations('nav');
  return (
    <Link href="/cart" className="relative px-2 sm:px-3 py-2 text-text-secondary hover:text-white transition" aria-label={t('cart')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 4.5 2H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -end-0.5 bg-gradient-neon text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
