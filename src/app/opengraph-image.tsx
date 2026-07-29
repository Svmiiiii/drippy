import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import path from 'path';

export const alt = 'Dropix — Your QR. Your Story.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Node runtime (not edge) so we can read the bundled font + icon straight
// off disk, same assets already used for the flocked-logo print files.
export default async function Image() {
  const iconBuffer = readFileSync(path.join(process.cwd(), 'public/logos/icon-original.png'));
  const iconDataUrl = `data:image/png;base64,${iconBuffer.toString('base64')}`;
  const bebasNeue = readFileSync(path.join(process.cwd(), 'src/lib/fonts/BebasNeue.ttf'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0B0F1A',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconDataUrl} width={180} height={193} alt="" />
        <div
          style={{
            fontFamily: 'Bebas Neue', fontSize: 130, color: '#FFFFFF',
            letterSpacing: 6, marginTop: 16, display: 'flex',
          }}
        >
          DROPIX
        </div>
        <div style={{ fontSize: 32, color: '#A0AEC0', marginTop: 4, display: 'flex' }}>
          Your QR. Your Story.
        </div>
        <div
          style={{
            width: 220, height: 6, borderRadius: 3, marginTop: 28, display: 'flex',
            background: 'linear-gradient(90deg, #7C3AED, #EC4899, #22D3EE)',
          }}
        />
      </div>
    ),
    { ...size, fonts: [{ name: 'Bebas Neue', data: bebasNeue, style: 'normal' }] },
  );
}
