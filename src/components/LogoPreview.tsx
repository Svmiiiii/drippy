'use client';

// Both the icon and the "DRIPPY" wordmark are white silhouettes on
// transparent PNGs (icon-mask.png / drippy-text-mask.png) — CSS mask-image
// lets us paint either with whatever gradient the customer picked for their
// QR, so the preview always matches the server-rendered flocking file (see
// generateLogoPng in production.ts).
const ICON_ASPECT = 496 / 463;
const TEXT_ASPECT = 165 / 1115;

function MaskedGradient({ mask, width, height, gradient }: { mask: string; width: number; height: number; gradient: string }) {
  return (
    <div
      style={{
        width, height, background: gradient,
        WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }}
    />
  );
}

export function LogoPreview({ variant, colors, size = 72 }: { variant: 'badge' | 'wordmark'; colors: readonly string[]; size?: number }) {
  const gradient = `linear-gradient(135deg, ${colors.join(', ')})`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <MaskedGradient mask="/logos/icon-mask.png" width={size} height={size * ICON_ASPECT} gradient={gradient} />
      {variant === 'wordmark' && (
        <MaskedGradient mask="/logos/drippy-text-mask.png" width={size * 1.05} height={size * 1.05 * TEXT_ASPECT} gradient={gradient} />
      )}
    </div>
  );
}
