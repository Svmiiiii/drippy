'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { QrCode } from './QrCode';
import type { PrintArea } from '@/types';

export const DEFAULT_PRINT_AREA: PrintArea = { top: 50, left: 50, width: 30 };

// Composites the live-styled QR onto the actual product photo, at the spot
// the admin defined as the print zone — same component used in the admin
// editor (click to reposition) and the customer-facing customizer (read-only,
// true WYSIWYG of what gets printed).
export function ProductQrPreview({
  imageUrl, printArea, preset = 'NEON', color, text, textPosition = 'none', font = 'Anton', textColor = '#FFFFFF', textSize = 100,
  onPrintAreaChange, editable = false,
}: {
  imageUrl: string | null;
  printArea: PrintArea;
  preset?: string;
  color?: string;
  text?: string;
  textPosition?: 'above' | 'below' | 'none';
  font?: string;
  textColor?: string;
  textSize?: number;
  onPrintAreaChange?: (area: PrintArea) => void;
  editable?: boolean;
}) {
  const t = useTranslations('admin.products');
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable || !onPrintAreaChange || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const left = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const top = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onPrintAreaChange({ ...printArea, left, top });
  }

  const qrSize = Math.max(40, Math.round(width * (printArea.width / 100)));

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative w-full aspect-square rounded-2xl overflow-hidden bg-[#0E1320] ${editable ? 'cursor-crosshair' : ''}`}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="(min-width: 768px) 448px, 100vw" className="object-cover pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-8xl pointer-events-none">👕</div>
      )}
      <div
        className="absolute pointer-events-none"
        style={{ left: `${printArea.left}%`, top: `${printArea.top}%`, transform: 'translate(-50%, -50%)' }}
      >
        <QrCode preset={preset} color={color} text={text} textPosition={textPosition} font={font} textColor={textColor} textSize={textSize} size={qrSize} />
      </div>
      {editable && (
        <div className="absolute bottom-2 start-1/2 -translate-x-1/2 text-[10px] bg-black/60 text-white px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap">
          {t('clickToPosition')}
        </div>
      )}
    </div>
  );
}
