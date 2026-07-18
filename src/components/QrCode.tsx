'use client';
import { useEffect, useRef } from 'react';
import { QR_PRESETS } from '@/lib/design';

interface Props {
  value?: string;
  preset?: string;
  text?: string;
  textPosition?: 'above' | 'below' | 'none';
  font?: string;
  textColor?: string;
  textSize?: number;
  size?: number;
}

// Base text size at the default 100% scale — matches the print-side default
// in production.ts (see the comment there) so growing/shrinking the text
// looks the same on screen as on the final flocked garment.
const BASE_TEXT_PX = 14;

// Renders a styled QR using qr-code-styling, with optional text above/below.
export function QrCode({ value = 'https://drippy.dz', preset = 'NEON', text, textPosition = 'none', font = 'Anton', textColor = '#FFFFFF', textSize = 100, size = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const p = QR_PRESETS.find((x) => x.id === preset) ?? QR_PRESETS[3];

  useEffect(() => {
    let qr: any;
    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      qr = new QRCodeStyling({
        width: size, height: size, data: value, type: 'svg',
        dotsOptions: {
          type: 'rounded',
          gradient: {
            type: 'linear', rotation: 0.78,
            colorStops: p.colors.map((c, i) => ({ offset: p.colors.length > 1 ? i / (p.colors.length - 1) : 0, color: c })),
          },
        },
        backgroundOptions: { color: 'transparent' },
        cornersSquareOptions: { type: 'extra-rounded', color: p.colors[0] },
      });
      if (ref.current) { ref.current.innerHTML = ''; qr.append(ref.current); }
    })();
  }, [value, preset, size, p.colors]);

  return (
    <div className="flex flex-col items-center gap-2">
      {text && textPosition === 'above' && (
        <div style={{ fontFamily: font, maxWidth: size, color: textColor, fontSize: BASE_TEXT_PX * (textSize / 100) }} className="text-center break-words">{text}</div>
      )}
      <div ref={ref} style={{ width: size, height: size }} className="rounded-2xl overflow-hidden" />
      {text && textPosition === 'below' && (
        <div style={{ fontFamily: font, maxWidth: size, color: textColor, fontSize: BASE_TEXT_PX * (textSize / 100) }} className="text-center break-words">{text}</div>
      )}
    </div>
  );
}
