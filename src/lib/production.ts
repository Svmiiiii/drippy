import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import { parse as parseFont, Font } from 'opentype.js';
import path from 'path';
import { readFileSync } from 'fs';
import { createAdminClient } from '@/lib/supabase/admin';
import { getQrColors } from '@/lib/design';

const BUCKET = 'productions';
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const MODULE_PX = 12; // pixels per QR module
const MARGIN_MODULES = 2;

// The customer picks a font from QR_FONTS (design.ts) which is loaded
// client-side via Google Fonts CSS. The server has none of those fonts
// installed, so librsvg/fontconfig would silently fall back to a generic
// sans-serif — the flocking image would then NOT match what the customer
// saw and picked. We bundle the actual font files and rasterize glyph
// outlines ourselves (via opentype.js) so the printed result is faithful
// regardless of what's installed on the host (works the same on Vercel).
const FONT_FILES: Record<string, string> = {
  'Anton': 'Anton.ttf',
  'Bebas Neue': 'BebasNeue.ttf',
  'Montserrat': 'Montserrat.ttf',
  'Poppins': 'Poppins.ttf',
  'Bangers': 'Bangers.ttf',
  'Luckiest Guy': 'LuckiestGuy.ttf',
};
const fontCache = new Map<string, Font>();

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function loadFont(fontId?: string): Font {
  const file = FONT_FILES[fontId ?? ''] ?? FONT_FILES['Anton'];
  const cached = fontCache.get(file);
  if (cached) return cached;
  const font = parseFont(toArrayBuffer(readFileSync(path.join(process.cwd(), 'src/lib/fonts', file))));
  fontCache.set(file, font);
  return font;
}

// font.getPath(text, ...) runs opentype.js's full Bidi/GSUB text-shaping
// pipeline, which throws on some fonts (e.g. Bangers) whose ccmp lookup
// table uses a substitution format the library doesn't support — and that
// pipeline always runs the ccmp step regardless of the `features` option.
// A short custom text on a garment sticker doesn't need ligatures/kerning,
// so glyphs are placed one at a time via straight cmap lookup instead.
function textToGlyphPaths(font: Font, text: string, x: number, y: number, fontSize: number): { pathData: string; width: number } {
  const scale = fontSize / font.unitsPerEm;
  let cx = x;
  const parts: string[] = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    parts.push(glyph.getPath(cx, y, fontSize).toPathData(2));
    cx += (glyph.advanceWidth ?? 0) * scale;
  }
  return { pathData: parts.join(' '), width: cx - x };
}

// ──────────────────────────────────────────────────────────────────────────────
// Drippy brand logo (garment-face flocking) — recolored to match qr_preset
// ──────────────────────────────────────────────────────────────────────────────

// icon-mask.png / drippy-text-mask.png are white silhouettes on transparent
// PNGs, extracted from the source artwork (no vector file was available).
// Painting a gradient through either via 'dest-in' recolors it exactly like
// the QR modules above, keeping the flocking file faithful to the live
// preview (LogoPreview.tsx uses the same PNGs as CSS mask-images).
const LOGO_ICON_MASK_PATH = path.join(process.cwd(), 'public/logos/icon-mask.png');
const LOGO_TEXT_MASK_PATH = path.join(process.cwd(), 'public/logos/drippy-text-mask.png');

async function recolorMask(maskPath: string, colors: string[]): Promise<Buffer> {
  const meta = await sharp(maskPath).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const stops = colors.map((c, i) =>
    `<stop offset="${colors.length > 1 ? i / (colors.length - 1) : 0}" stop-color="${c}"/>`
  ).join('');
  const gradientSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="${h}">${stops}</linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`;
  const gradientBuf = await sharp(Buffer.from(gradientSvg)).png().toBuffer();
  return sharp(gradientBuf).composite([{ input: maskPath, blend: 'dest-in' }]).png().toBuffer();
}

async function generateLogoPng(choice: 'badge' | 'wordmark', colors: string[]): Promise<Buffer> {
  const coloredIcon = await recolorMask(LOGO_ICON_MASK_PATH, colors);
  if (choice === 'badge') return coloredIcon;

  const iconMeta = await sharp(LOGO_ICON_MASK_PATH).metadata();
  const iconW = iconMeta.width!;
  const iconH = iconMeta.height!;

  // "wordmark" variant: the recolored icon stacked above the "DRIPPY"
  // wordmark, recolored with the same gradient for a consistent mark.
  const coloredText = await recolorMask(LOGO_TEXT_MASK_PATH, colors);
  const textMeta = await sharp(LOGO_TEXT_MASK_PATH).metadata();
  const textW = textMeta.width!;
  const textH = textMeta.height!;
  const gap = Math.round(iconH * 0.06);
  const totalW = Math.max(iconW, textW);
  const totalH = iconH + gap + textH;

  return sharp({ create: { width: totalW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: coloredIcon, left: Math.round((totalW - iconW) / 2), top: 0 },
      { input: coloredText, left: Math.round((totalW - textW) / 2), top: iconH + gap },
    ])
    .png()
    .toBuffer();
}

// ──────────────────────────────────────────────────────────────────────────────
// SVG QR generator (server-side, no browser APIs)
// ──────────────────────────────────────────────────────────────────────────────

interface ItemStyle {
  qrPreset: string;
  qrColor?: string;
  text?: string;
  textPosition?: 'above' | 'below' | 'none';
  textFont?: string;
  textColor?: string;
  textSize?: number; // percentage, 100 = default — matches QrCode.tsx's client-side scale
}

// Finder patterns (the 3 big "eyes") always sit at fixed 7x7 corners of any
// QR matrix — same rule the `qrcode` library uses to build the data.
const FINDER_SIZE = 7;
function isFinderModule(row: number, col: number, size: number): boolean {
  const topLeft = row < FINDER_SIZE && col < FINDER_SIZE;
  const topRight = row < FINDER_SIZE && col >= size - FINDER_SIZE;
  const bottomLeft = row >= size - FINDER_SIZE && col < FINDER_SIZE;
  return topLeft || topRight || bottomLeft;
}

// Client preview (QrCode.tsx / qr-code-styling) renders finder squares as a
// single solid extra-rounded ring + center dot in colors[0], not gradient
// dots. Replicated here with an SVG mask so production output matches.
function finderPatternSvg(originCol: number, originRow: number, qrOffsetY: number, color: string, maskId: string, qrOffsetX = 0): string {
  const x = (originCol + MARGIN_MODULES) * MODULE_PX + qrOffsetX;
  const y = (originRow + MARGIN_MODULES) * MODULE_PX + qrOffsetY;
  const outer = MODULE_PX * 7;
  const mid = MODULE_PX * 5;
  const midOffset = MODULE_PX * 1;
  const inner = MODULE_PX * 3;
  const innerOffset = MODULE_PX * 2;
  return `
    <mask id="${maskId}">
      <rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${outer * 0.4}" ry="${outer * 0.4}" fill="white"/>
      <rect x="${x + midOffset}" y="${y + midOffset}" width="${mid}" height="${mid}" rx="${mid * 0.4}" ry="${mid * 0.4}" fill="black"/>
    </mask>
    <rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${outer * 0.4}" ry="${outer * 0.4}" fill="${color}" mask="url(#${maskId})"/>
    <rect x="${x + innerOffset}" y="${y + innerOffset}" width="${inner}" height="${inner}" rx="${inner * 0.4}" ry="${inner * 0.4}" fill="${color}"/>
  `;
}

/**
 * Generates a transparent SVG: styled gradient QR + optional text.
 * Background is transparent (suitable for flocking/DTF print).
 */
async function generateItemSvg(qrUrl: string, style: ItemStyle): Promise<string> {
  const colors = getQrColors(style.qrPreset, style.qrColor);

  // Get QR data matrix via qrcode library
  const qrData = (QRCode as any).create(qrUrl, { errorCorrectionLevel: 'H' });
  const size = qrData.modules.size as number;
  const data = qrData.modules.data as Uint8Array;

  const fontSize = Math.max(14, Math.round(MODULE_PX * 1.4 * ((style.textSize ?? 100) / 100)));
  const textGap = 8;
  const hasText = !!style.text && style.textPosition !== 'none';
  const textBlockH = hasText ? fontSize + textGap * 2 : 0;

  const qrPx = (size + MARGIN_MODULES * 2) * MODULE_PX;

  // Render the text as real glyph outlines (see loadFont) so the printed
  // result matches the exact font the customer picked, rather than
  // whatever fallback font the host happens to have installed. The
  // canvas is widened past qrPx when the text is wider than the QR so
  // long strings aren't clipped.
  let textWidth = 0;
  if (hasText) {
    const font = loadFont(style.textFont);
    textWidth = textToGlyphPaths(font, style.text!, 0, 0, fontSize).width;
  }

  const totalW = Math.max(qrPx, Math.ceil(textWidth) + 24);
  const totalH = qrPx + textBlockH;
  const qrOffsetX = (totalW - qrPx) / 2;

  const qrOffsetY = style.textPosition === 'above' ? textBlockH : 0;
  const textY = style.textPosition === 'above'
    ? fontSize + textGap
    : qrPx + textGap + fontSize;

  let textPathD = '';
  if (hasText) {
    const font = loadFont(style.textFont);
    const dx = (totalW - textWidth) / 2;
    textPathD = textToGlyphPaths(font, style.text!, dx, textY, fontSize).pathData;
  }

  // Rounded dot radius
  const r = MODULE_PX * 0.38;

  // Build module rects — finder patterns are skipped here and drawn
  // separately below as solid shapes, matching the client preview.
  let rects = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col] && !isFinderModule(row, col, size)) {
        const x = (col + MARGIN_MODULES) * MODULE_PX + qrOffsetX;
        const y = (row + MARGIN_MODULES) * MODULE_PX + qrOffsetY;
        rects += `<rect x="${x}" y="${y}" width="${MODULE_PX}" height="${MODULE_PX}" rx="${r}" ry="${r}" fill="url(#g)"/>`;
      }
    }
  }

  const finders = [
    finderPatternSvg(0, 0, qrOffsetY, colors[0], 'fmask-0', qrOffsetX),
    finderPatternSvg(size - FINDER_SIZE, 0, qrOffsetY, colors[0], 'fmask-1', qrOffsetX),
    finderPatternSvg(0, size - FINDER_SIZE, qrOffsetY, colors[0], 'fmask-2', qrOffsetX),
  ].join('');

  // Gradient stops from preset colors
  const stops = colors.map((c, i) =>
    `<stop offset="${colors.length > 1 ? i / (colors.length - 1) : 0}" stop-color="${c}"/>`
  ).join('');

  const textSvg = hasText
    ? `<path d="${textPathD}" fill="${style.textColor ?? '#FFFFFF'}"/>`
    : '';

  // gradientUnits="userSpaceOnUse" is the key fix: without it, SVG defaults
  // to objectBoundingBox, which makes EACH module rect independently replay
  // the full color transition across its own tiny box instead of sharing one
  // continuous gradient across the whole QR — the client preview (qr-code-
  // styling) always renders one shared gradient across the full canvas.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${qrOffsetX}" y1="${qrOffsetY}" x2="${qrOffsetX + qrPx}" y2="${qrOffsetY + qrPx}">${stops}</linearGradient>
  </defs>
  ${rects}
  ${finders}
  ${textSvg}
</svg>`;
}

/**
 * Convert an SVG string to a transparent PNG buffer using sharp.
 */
async function svgToPng(svgString: string): Promise<Buffer> {
  return sharp(Buffer.from(svgString, 'utf-8'))
    .png()
    .toBuffer();
}

// ──────────────────────────────────────────────────────────────────────────────
// Welcome Pack PDF (sent to customer with credentials)
// ──────────────────────────────────────────────────────────────────────────────

async function generateWelcomePdf(opts: {
  drippyId: string;
  tempPassword: string;
  qrUrl: string;
  qrUid: string;
  customerName: string;
  orderNumber: string;
  qrPngBuffer: Buffer;
}): Promise<Buffer> {
  const { drippyId, tempPassword, qrUrl, qrUid, customerName, orderNumber, qrPngBuffer } = opts;

  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  const pngImage = await doc.embedPng(qrPngBuffer);

  const purple = rgb(0.49, 0.23, 0.93);
  const pink = rgb(0.93, 0.29, 0.6);
  const white = rgb(1, 1, 1);
  const grey = rgb(0.62, 0.67, 0.75);
  const black = rgb(0.08, 0.08, 0.08);
  const cyan = rgb(0.13, 0.83, 0.93);

  const page = doc.addPage([595, 842]);
  let y = 800;

  const line = (text: string, size = 12, font: PDFFont = fontReg, color = white, indent = 50) => {
    page.drawText(String(text), { x: indent, y, size, font, color });
    y -= size + 8;
  };

  // Header
  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: purple });
  page.drawText('DRIPPY', { x: 50, y: 810, size: 22, font: fontBold, color: white });
  page.drawText('BIENVENUE DANS TA FAMILLE', { x: 180, y: 814, size: 11, font: fontReg, color: rgb(0.8, 0.6, 1) });

  y = 760;
  line(`Bonjour ${customerName} !`, 16, fontBold, white);
  y -= 4;
  line('Ton Drippy est prêt. Voici tes accès pour gérer ton QR et suivre tes commandes.', 11, fontReg, grey);

  // Credentials box
  y -= 16;
  page.drawRectangle({ x: 40, y: y - 80, width: 515, height: 90, color: rgb(0.07, 0.1, 0.18), borderColor: purple, borderWidth: 1 });
  y -= 8;
  line('*** TES IDENTIFIANTS DRIPPY ***', 10, fontBold, purple, 55);
  y += 4;
  line(`ID Drippy   :  ${drippyId}`, 13, fontBold, cyan, 55);
  line(`Mot de passe:  ${tempPassword}`, 13, fontBold, pink, 55);
  line(`Email       :  Ton email de commande`, 11, fontReg, grey, 55);
  y -= 8;

  // Instructions
  y -= 12;
  line('Comment activer ton compte :', 12, fontBold, white);
  const steps = [
    `1. Rends-toi sur ${APP_URL}/login`,
    `2. Connecte-toi avec ton email et le mot de passe ci-dessus`,
    '3. Change ton mot de passe dès la première connexion',
    '4. Ton QR est déjà actif — scanne-le pour tester !',
  ];
  for (const s of steps) line(s, 11, fontReg, grey, 60);

  // QR section
  y -= 20;
  line('Ton QR Drippy :', 12, fontBold, white);
  const qrSize = 140;
  page.drawImage(pngImage, { x: 50, y: y - qrSize, width: qrSize, height: qrSize });
  page.drawText(`UID : ${qrUid}`, { x: 210, y: y - 30, size: 11, font: fontBold, color: cyan });
  page.drawText(`URL : ${qrUrl}`, { x: 210, y: y - 50, size: 9, font: fontReg, color: grey });
  page.drawText('Scanne ce QR depuis ton téléphone', { x: 210, y: y - 70, size: 10, font: fontReg, color: grey });
  page.drawText(`Commande : ${orderNumber}`, { x: 210, y: y - 90, size: 10, font: fontReg, color: grey });

  y -= qrSize + 16;

  // Security notice
  y -= 8;
  page.drawRectangle({ x: 40, y: y - 36, width: 515, height: 44, color: rgb(0.35, 0.08, 0.08), borderColor: rgb(0.8, 0.2, 0.2), borderWidth: 1 });
  y -= 6;
  line('! SECURITE : Ces identifiants sont personnels et confidentiels.', 10, fontBold, rgb(1, 0.5, 0.5), 55);
  line('   Ne les partage jamais. Drippy ne te les demandera jamais par email ou téléphone.', 9, fontReg, rgb(1, 0.5, 0.5), 55);

  // Footer
  page.drawText('Powered by Drippy · drippy.dz', { x: 200, y: 30, size: 9, font: fontReg, color: grey });

  return Buffer.from(await doc.save());
}

// ──────────────────────────────────────────────────────────────────────────────
// Production sheet PDF (internal — one page per item)
// ──────────────────────────────────────────────────────────────────────────────

async function generateProductionPdf(opts: {
  orderNumber: string;
  qrUid: string;
  qrUrl: string;
  items: any[];
  itemPngs: Buffer[];
  itemLogoPngs: (Buffer | null)[];
}): Promise<Buffer> {
  const { orderNumber, qrUid, qrUrl, items, itemPngs, itemLogoPngs } = opts;
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  const purple = rgb(0.49, 0.23, 0.93);
  const pink = rgb(0.93, 0.29, 0.6);
  const white = rgb(1, 1, 1);
  const grey = rgb(0.62, 0.67, 0.75);
  const cyan = rgb(0.13, 0.83, 0.93);

  // Cover page
  const cover = doc.addPage([595, 842]);
  cover.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: purple });
  cover.drawText('DRIPPY — FICHE DE PRODUCTION', { x: 50, y: 810, size: 16, font: fontBold, color: white });
  let cy = 760;
  const cl = (text: string, size = 12, font: PDFFont = fontReg, color = white) => {
    cover.drawText(text, { x: 50, y: cy, size, font, color });
    cy -= size + 8;
  };
  cl(`Commande : ${orderNumber}`, 16, fontBold, cyan);
  cl(`QR ID    : ${qrUid}`, 12, fontBold, white);
  cl(`QR URL   : ${qrUrl}`, 10, fontReg, grey);

  cy -= 12;
  cl(`Nombre d'articles : ${items.length}`, 12, fontReg, white);

  // One page per item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pngBuf = itemPngs[i];
    const page = doc.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: pink });
    page.drawText(`ARTICLE ${i + 1}/${items.length}`, { x: 50, y: 810, size: 14, font: fontBold, color: white });
    page.drawText(orderNumber, { x: 400, y: 810, size: 10, font: fontReg, color: rgb(1, 0.7, 0.9) });

    let y = 760;
    const l = (text: string, size = 12, font: PDFFont = fontReg, color = white) => {
      page.drawText(text, { x: 50, y, size, font, color });
      y -= size + 8;
    };

    l(item.product_name ?? 'Produit', 16, fontBold, white);
    y -= 4;
    l(`Taille : ${item.size ?? '—'}   |   Quantité : ${item.quantity ?? 1}`, 12, fontReg, white);
    l(`Style QR : ${item.qr_preset === 'CUSTOM' ? `Custom (${item.qr_color})` : (item.qr_preset ?? 'NEON')}`, 12, fontBold, pink);
    if (item.text_content) {
      l(`Texte : "${item.text_content}"`, 11, fontReg, cyan);
      l(`Position : ${item.text_position ?? 'below'}   |   Police : ${item.text_font ?? 'Anton'}   |   Couleur : ${item.text_color ?? '#FFFFFF'}`, 10, fontReg, grey);
    }
    if (item.logo_choice) {
      const posLabel = item.logo_position === 'top_left' ? 'Haut gauche (cœur)' : item.logo_position === 'center' ? 'Centre' : 'Au choix du prestataire';
      l(`Logo : ${item.logo_choice === 'wordmark' ? 'Avec texte' : 'Badge'}   |   Position : ${posLabel}`, 11, fontReg, cyan);
    }

    // Print-ready image
    y -= 20;
    l('Image à imprimer/floquer (fond transparent) :', 10, fontBold, grey);
    const pngImg = await doc.embedPng(pngBuf);
    const imgSize = 200;
    page.drawImage(pngImg, { x: 50, y: y - imgSize, width: imgSize, height: imgSize });

    const logoBuf = itemLogoPngs[i];
    if (logoBuf) {
      const logoImg = await doc.embedPng(logoBuf);
      const logoDims = logoImg.scale(1);
      const logoW = 110;
      const logoH = logoW * (logoDims.height / logoDims.width);
      page.drawText('Logo Drippy :', { x: 300, y: y, size: 10, font: fontBold, color: grey });
      page.drawImage(logoImg, { x: 300, y: y - 20 - logoH, width: logoW, height: logoH });
    }

    // Checklist — placed below both the QR image and the (taller) logo image
    const checkX = 300;
    let checkY = y - 210;
    const check = (label: string) => {
      page.drawRectangle({ x: checkX, y: checkY - 12, width: 14, height: 14, borderColor: grey, borderWidth: 1 });
      page.drawText(label, { x: checkX + 20, y: checkY - 10, size: 11, font: fontReg, color: white });
      checkY -= 26;
    };
    page.drawText('Checklist production', { x: checkX, y: checkY + 10, size: 11, font: fontBold, color: purple });
    checkY -= 8;
    check('Impression validée');
    check('Flocage validé');
    check('Emballage effectué');
    check('Contrôle qualité');

    // Footer
    page.drawText('Powered by Drippy', { x: 240, y: 30, size: 8, font: fontReg, color: grey });
  }

  return Buffer.from(await doc.save());
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export interface GenerationResult {
  svg_path: string;
  png_path: string;
  pdf_path: string;
  welcome_pdf_path: string;
  zip_path: string;
  qr_uid: string;
  qr_url: string;
  item_png_paths: string[];
  item_logo_paths: (string | null)[];
}

export async function generateProductionFiles(
  orderId: string,
  credentials?: { drippyId: string; tempPassword: string; customerName: string },
): Promise<GenerationResult> {
  const admin = createAdminClient();

  const { data: production, error: prodErr } = await admin
    .from('productions')
    .select('id, snapshot_json, qr_code_id, png_path')
    .eq('order_id', orderId)
    .single();
  if (prodErr || !production) throw new Error('No production snapshot found');

  const { data: qr } = await admin.from('qr_codes').select('qr_uid').eq('id', production.qr_code_id).single();
  if (!qr) throw new Error('QR code not found');

  const snapshot = production.snapshot_json as any;
  const items: any[] = snapshot?.items ?? [];
  const orderNumber: string = snapshot?.order_number ?? orderId;
  const qrUrl = `${APP_URL}/qr/${qr.qr_uid}`;
  const base = orderId;

  // If files already exist and no fresh credentials, return cached paths
  if ((production as any).png_path && !credentials) {
    return {
      svg_path: `${base}/item_0.svg`, png_path: `${base}/item_0.png`,
      pdf_path: `${base}/production.pdf`, welcome_pdf_path: `${base}/welcome.pdf`,
      zip_path: `${base}/ORDER_PRODUCTION.zip`,
      qr_uid: qr.qr_uid, qr_url: qrUrl,
      item_png_paths: items.map((_, i) => `${base}/item_${i}.png`),
      item_logo_paths: items.map((item, i) => (item.logo_choice ? `${base}/item_logo_${i}.png` : null)),
    };
  }

  // ── Per-item file generation ─────────────────────────────────────────────
  const itemSvgs: string[] = [];
  const itemPngs: Buffer[] = [];
  const itemLogoPaths: (string | null)[] = [];
  const itemLogoPngs: (Buffer | null)[] = [];
  const uploads: Promise<any>[] = [];

  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const style: ItemStyle = {
      qrPreset: item.qr_preset ?? 'NEON',
      qrColor: item.qr_color ?? undefined,
      text: item.text_content ?? undefined,
      textPosition: item.text_position ?? 'none',
      textFont: item.text_font ?? 'Anton',
      textColor: item.text_color ?? '#FFFFFF',
      textSize: item.text_size ?? 100,
    };

    const svg = await generateItemSvg(qrUrl, style);
    const png = await svgToPng(svg);
    itemSvgs.push(svg);
    itemPngs.push(png);

    uploads.push(
      admin.storage.from(BUCKET).upload(`${base}/item_${i}.svg`, Buffer.from(svg, 'utf-8'), { contentType: 'image/svg+xml', upsert: true }),
      admin.storage.from(BUCKET).upload(`${base}/item_${i}.png`, png, { contentType: 'image/png', upsert: true }),
    );

    if (item.logo_choice === 'badge' || item.logo_choice === 'wordmark') {
      const logoPng = await generateLogoPng(item.logo_choice, getQrColors(style.qrPreset, style.qrColor));
      const logoPath = `${base}/item_logo_${i}.png`;
      itemLogoPaths.push(logoPath);
      itemLogoPngs.push(logoPng);
      uploads.push(
        admin.storage.from(BUCKET).upload(logoPath, logoPng, { contentType: 'image/png', upsert: true }),
      );
    } else {
      itemLogoPaths.push(null);
      itemLogoPngs.push(null);
    }
  }

  // ── Production PDF ────────────────────────────────────────────────────────
  const productionPdf = await generateProductionPdf({
    orderNumber, qrUid: qr.qr_uid, qrUrl,
    items, itemPngs, itemLogoPngs,
  });

  uploads.push(
    admin.storage.from(BUCKET).upload(`${base}/production.pdf`, productionPdf, { contentType: 'application/pdf', upsert: true }),
  );

  // ── Welcome Pack PDF (with credentials) ──────────────────────────────────
  // Use a simple QR PNG for the welcome pack (first preset color, white background)
  const welcomeQrPng = await QRCode.toBuffer(qrUrl, {
    type: 'png', width: 200, margin: 2,
    color: { dark: '#7C3AED', light: '#FFFFFF' },
  });

  const creds = credentials ?? { drippyId: qr.qr_uid, tempPassword: '(voir votre email)', customerName: 'Client' };
  const welcomePdf = await generateWelcomePdf({
    drippyId: creds.drippyId,
    tempPassword: creds.tempPassword,
    qrUrl, qrUid: qr.qr_uid,
    customerName: creds.customerName,
    orderNumber,
    qrPngBuffer: welcomeQrPng,
  });

  uploads.push(
    admin.storage.from(BUCKET).upload(`${base}/welcome.pdf`, welcomePdf, { contentType: 'application/pdf', upsert: true }),
  );

  // ── ZIP ───────────────────────────────────────────────────────────────────
  const zip = new JSZip();
  for (let i = 0; i < items.length; i++) {
    const itemNum = String(i + 1).padStart(2, '0');
    zip.file(`${orderNumber}_ITEM-${itemNum}.svg`, Buffer.from(itemSvgs[i], 'utf-8'));
    zip.file(`${orderNumber}_ITEM-${itemNum}.png`, itemPngs[i]);
    if (itemLogoPngs[i]) zip.file(`${orderNumber}_ITEM-${itemNum}_LOGO.png`, itemLogoPngs[i]!);
  }
  zip.file(`${orderNumber}_PRODUCTION.pdf`, productionPdf);
  zip.file(`${orderNumber}_WELCOME.pdf`, welcomePdf);
  const zipBuffer = Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));

  uploads.push(
    admin.storage.from(BUCKET).upload(`${base}/ORDER_PRODUCTION.zip`, zipBuffer, { contentType: 'application/zip', upsert: true }),
  );

  await Promise.all(uploads);

  // ── Update DB paths ───────────────────────────────────────────────────────
  await admin.from('productions').update({
    svg_path: `${base}/item_0.svg`,
    png_path: `${base}/item_0.png`,
    pdf_path: `${base}/production.pdf`,
    zip_path: `${base}/ORDER_PRODUCTION.zip`,
  }).eq('id', production.id);

  return {
    svg_path: `${base}/item_0.svg`,
    png_path: `${base}/item_0.png`,
    pdf_path: `${base}/production.pdf`,
    welcome_pdf_path: `${base}/welcome.pdf`,
    zip_path: `${base}/ORDER_PRODUCTION.zip`,
    qr_uid: qr.qr_uid,
    qr_url: qrUrl,
    item_png_paths: items.map((_, i) => `${base}/item_${i}.png`),
    item_logo_paths: itemLogoPaths,
  };
}

// expiresIn defaults to a quick one-off download click; the partner queue
// view passes a longer window since it keeps image previews on screen.
export async function getSignedDownloadUrl(filePath: string, expiresIn = 120): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(filePath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not create signed URL');
  return data.signedUrl;
}

// Raw bytes of the welcome PDF (credentials), for attaching to the
// "shipped" email — generateProductionFiles is idempotent (cached path)
// since it was already generated at the send-partner step.
export async function getWelcomePdfBuffer(orderId: string): Promise<Buffer> {
  const { welcome_pdf_path } = await generateProductionFiles(orderId);
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(welcome_pdf_path);
  if (error || !data) throw new Error(error?.message ?? 'Could not download welcome PDF');
  return Buffer.from(await data.arrayBuffer());
}
