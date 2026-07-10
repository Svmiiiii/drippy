import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import { QR_PRESETS } from '@/lib/design';

const BUCKET = 'productions';
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const MODULE_PX = 12; // pixels per QR module
const MARGIN_MODULES = 2;

// ──────────────────────────────────────────────────────────────────────────────
// SVG QR generator (server-side, no browser APIs)
// ──────────────────────────────────────────────────────────────────────────────

interface ItemStyle {
  qrPreset: string;
  text?: string;
  textPosition?: 'above' | 'below' | 'none';
  textFont?: string;
  textColor?: string;
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
function finderPatternSvg(originCol: number, originRow: number, qrOffsetY: number, color: string, maskId: string): string {
  const x = (originCol + MARGIN_MODULES) * MODULE_PX;
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
  const preset = QR_PRESETS.find((p) => p.id === style.qrPreset) ?? QR_PRESETS[0];
  const colors = preset.colors;

  // Get QR data matrix via qrcode library
  const qrData = (QRCode as any).create(qrUrl, { errorCorrectionLevel: 'H' });
  const size = qrData.modules.size as number;
  const data = qrData.modules.data as Uint8Array;

  const fontSize = Math.max(14, Math.round(MODULE_PX * 1.4));
  const textGap = 8;
  const textBlockH = style.text && style.textPosition !== 'none' ? fontSize + textGap * 2 : 0;

  const qrPx = (size + MARGIN_MODULES * 2) * MODULE_PX;
  const totalW = qrPx;
  const totalH = qrPx + textBlockH;

  const qrOffsetY = style.textPosition === 'above' ? textBlockH : 0;
  const textY = style.textPosition === 'above'
    ? fontSize + textGap
    : qrPx + textGap + fontSize;

  // Rounded dot radius
  const r = MODULE_PX * 0.38;

  // Build module rects — finder patterns are skipped here and drawn
  // separately below as solid shapes, matching the client preview.
  let rects = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col] && !isFinderModule(row, col, size)) {
        const x = (col + MARGIN_MODULES) * MODULE_PX;
        const y = (row + MARGIN_MODULES) * MODULE_PX + qrOffsetY;
        rects += `<rect x="${x}" y="${y}" width="${MODULE_PX}" height="${MODULE_PX}" rx="${r}" ry="${r}" fill="url(#g)"/>`;
      }
    }
  }

  const finders = [
    finderPatternSvg(0, 0, qrOffsetY, colors[0], 'fmask-0'),
    finderPatternSvg(size - FINDER_SIZE, 0, qrOffsetY, colors[0], 'fmask-1'),
    finderPatternSvg(0, size - FINDER_SIZE, qrOffsetY, colors[0], 'fmask-2'),
  ].join('');

  // Gradient stops from preset colors
  const stops = colors.map((c, i) =>
    `<stop offset="${colors.length > 1 ? i / (colors.length - 1) : 0}" stop-color="${c}"/>`
  ).join('');

  const safeText = (style.text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const textSvg = style.text && style.textPosition !== 'none'
    ? `<text x="${totalW / 2}" y="${textY}" text-anchor="middle" dominant-baseline="auto"
         font-family="${style.textFont ?? 'Arial'}, sans-serif" font-size="${fontSize}"
         fill="${style.textColor ?? '#FFFFFF'}" font-weight="bold">${safeText}</text>`
    : '';

  // gradientUnits="userSpaceOnUse" is the key fix: without it, SVG defaults
  // to objectBoundingBox, which makes EACH module rect independently replay
  // the full color transition across its own tiny box instead of sharing one
  // continuous gradient across the whole QR — the client preview (qr-code-
  // styling) always renders one shared gradient across the full canvas.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${qrOffsetY}" x2="${qrPx}" y2="${qrOffsetY + qrPx}">${stops}</linearGradient>
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
}): Promise<Buffer> {
  const { orderNumber, qrUid, qrUrl, items, itemPngs } = opts;
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
    l(`Style QR : ${item.qr_preset ?? 'NEON'}`, 12, fontBold, pink);
    if (item.text_content) {
      l(`Texte : "${item.text_content}"`, 11, fontReg, cyan);
      l(`Position : ${item.text_position ?? 'below'}   |   Police : ${item.text_font ?? 'Anton'}   |   Couleur : ${item.text_color ?? '#FFFFFF'}`, 10, fontReg, grey);
    }

    // Print-ready image
    y -= 20;
    l('Image à imprimer/floquer (fond transparent) :', 10, fontBold, grey);
    const pngImg = await doc.embedPng(pngBuf);
    const imgSize = 200;
    page.drawImage(pngImg, { x: 50, y: y - imgSize, width: imgSize, height: imgSize });

    // Checklist
    const checkX = 300;
    let checkY = y - 10;
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
    };
  }

  // ── Per-item file generation ─────────────────────────────────────────────
  const itemSvgs: string[] = [];
  const itemPngs: Buffer[] = [];
  const uploads: Promise<any>[] = [];

  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const style: ItemStyle = {
      qrPreset: item.qr_preset ?? 'NEON',
      text: item.text_content ?? undefined,
      textPosition: item.text_position ?? 'none',
      textFont: item.text_font ?? 'Anton',
      textColor: item.text_color ?? '#FFFFFF',
    };

    const svg = await generateItemSvg(qrUrl, style);
    const png = await svgToPng(svg);
    itemSvgs.push(svg);
    itemPngs.push(png);

    uploads.push(
      admin.storage.from(BUCKET).upload(`${base}/item_${i}.svg`, Buffer.from(svg, 'utf-8'), { contentType: 'image/svg+xml', upsert: true }),
      admin.storage.from(BUCKET).upload(`${base}/item_${i}.png`, png, { contentType: 'image/png', upsert: true }),
    );
  }

  // ── Production PDF ────────────────────────────────────────────────────────
  const productionPdf = await generateProductionPdf({
    orderNumber, qrUid: qr.qr_uid, qrUrl,
    items, itemPngs,
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
