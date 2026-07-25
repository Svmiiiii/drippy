import type { Metadata } from 'next';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/components/Providers';
import { getUserLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Dropix — Your QR. Your Story.',
  description: 'Streetwear premium avec ton QR Code personnel, unique et permanent. Algérie.',
  openGraph: {
    title: 'Dropix — Your QR. Your Story.',
    description: 'Porte ton identité numérique dans le monde réel.',
  },
  // The site has its own FR/EN/AR switcher — Chrome's auto-translate races
  // with React hydration and corrupts the DOM (causing "server didn't match
  // client" errors), so it's disabled here rather than worked around per node.
  other: { google: 'notranslate' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} translate="no" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
