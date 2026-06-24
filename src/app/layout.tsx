import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Drippy — Your QR. Your Story.',
  description: 'Streetwear premium avec ton QR Code personnel, unique et permanent. Algérie.',
  openGraph: {
    title: 'Drippy — Your QR. Your Story.',
    description: 'Porte ton identité numérique dans le monde réel.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
