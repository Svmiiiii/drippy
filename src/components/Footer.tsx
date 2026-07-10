import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');

  const legalLinks = [
    { href: '/cgv', label: t('cgv') },
    { href: '/retours', label: t('returns') },
    { href: '/confidentialite', label: t('privacy') },
    { href: '/mentions-legales', label: t('legal') },
  ];

  return (
    <footer className="bg-[#0E1320] border-t border-border py-10 text-center">
      <div className="font-heading text-3xl gradient-text mb-2">DRIPPY</div>
      <div className="text-text-secondary text-sm mb-4">{t('tagline')}</div>
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4 px-6">
        {legalLinks.map((l) => (
          <a key={l.href} href={l.href} className="text-text-secondary text-xs hover:text-white transition">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="text-text-secondary text-xs">{t('copyright')}</div>
    </footer>
  );
}
