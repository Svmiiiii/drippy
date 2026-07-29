import { Resend } from 'resend';
import { formatDZD } from '@/lib/utils';
import type { Locale } from '@/lib/locale-config';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Dropix <no-reply@dropix.dz>';

function wrap(lang: Locale, bodyHtml: string): string {
  const rtl = lang === 'ar';
  return `
    <div dir="${rtl ? 'rtl' : 'ltr'}" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111; text-align: ${rtl ? 'right' : 'left'};">
      ${bodyHtml}
      <p style="color:#888;font-size:12px;margin-top:24px;">Dropix — Your QR. Your Story.</p>
    </div>
  `;
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

// The Resend SDK resolves (doesn't reject) on API-level failures like an
// unverified sending domain — it returns { error } instead of throwing. A
// bare `await resend.emails.send(...)` inside a try/catch therefore never
// catches those failures, silently dropping the email. Route every send
// through here so callers' try/catch (or .catch()) actually fires.
async function sendMail(params: Parameters<typeof resend.emails.send>[0]) {
  const { error } = await resend.emails.send(params);
  if (error) throw new Error(`[resend] ${error.name}: ${error.message}`);
}

// ─── Order received (checkout) ──────────────────────────────────────────────

const RECEIVED_STRINGS: Record<Locale, { subject: (o: string) => string; greeting: (n: string) => string; body: (o: string) => string; total: string; cod: string; willCall: string }> = {
  fr: {
    subject: (o) => `Commande ${o} reçue — Dropix`,
    greeting: (n) => `Merci ${n} !`,
    body: (o) => `Ta commande <strong>${o}</strong> a bien été reçue.`,
    total: 'Total :',
    cod: '(paiement à la livraison)',
    willCall: "Un membre de notre équipe va t'appeler très prochainement pour confirmer ta commande.",
  },
  en: {
    subject: (o) => `Order ${o} received — Dropix`,
    greeting: (n) => `Thanks ${n}!`,
    body: (o) => `Your order <strong>${o}</strong> has been received.`,
    total: 'Total:',
    cod: '(cash on delivery)',
    willCall: 'A member of our team will call you shortly to confirm your order.',
  },
  ar: {
    subject: (o) => `تم استلام طلبك ${o} — Dropix`,
    greeting: (n) => `شكرًا ${n}!`,
    body: (o) => `تم استلام طلبك <strong>${o}</strong> بنجاح.`,
    total: 'المجموع:',
    cod: '(الدفع عند الاستلام)',
    willCall: 'سيتصل بك أحد أعضاء فريقنا قريبًا لتأكيد طلبك.',
  },
};

export async function sendOrderReceivedEmail(params: {
  to: string;
  orderNumber: string;
  customerName: string;
  items: { name: string; quantity: number }[];
  totalDzd: number;
  language: Locale;
}) {
  const s = RECEIVED_STRINGS[params.language] ?? RECEIVED_STRINGS.fr;
  const itemsHtml = params.items.map((i) => `<li>${i.quantity} × ${i.name}</li>`).join('');
  try {
    await sendMail({
      from: FROM,
      to: params.to,
      subject: s.subject(params.orderNumber),
      html: wrap(params.language, `
        <h2>${s.greeting(firstName(params.customerName))}</h2>
        <p>${s.body(params.orderNumber)}</p>
        <ul>${itemsHtml}</ul>
        <p><strong>${s.total} ${formatDZD(params.totalDzd)}</strong> ${s.cod}</p>
        <p>${s.willCall}</p>
      `),
    });
  } catch (err) {
    console.error('[email] order confirmation failed:', err);
  }
}

// ─── In production (sent to partner) ────────────────────────────────────────

const IN_PRODUCTION_STRINGS: Record<Locale, { subject: (o: string) => string; greeting: (n: string) => string; body: (o: string) => string; footer: string }> = {
  fr: {
    subject: (o) => `Ta commande ${o} est en préparation — Dropix`,
    greeting: (n) => `Ça bouge, ${n} !`,
    body: (o) => `Ta commande <strong>${o}</strong> est maintenant en cours de préparation.`,
    footer: "On te tient au courant dès qu'elle prend la route.",
  },
  en: {
    subject: (o) => `Your order ${o} is being prepared — Dropix`,
    greeting: (n) => `Things are moving, ${n}!`,
    body: (o) => `Your order <strong>${o}</strong> is now being prepared.`,
    footer: "We'll let you know as soon as it's on its way.",
  },
  ar: {
    subject: (o) => `طلبك ${o} قيد التحضير — Dropix`,
    greeting: (n) => `الأمور تتحرك، ${n}!`,
    body: (o) => `طلبك <strong>${o}</strong> قيد التحضير الآن.`,
    footer: 'سنعلمك بمجرد أن يكون في الطريق.',
  },
};

export async function sendOrderInProductionEmail(params: { to: string; orderNumber: string; customerName: string; language: Locale }) {
  const s = IN_PRODUCTION_STRINGS[params.language] ?? IN_PRODUCTION_STRINGS.fr;
  try {
    await sendMail({
      from: FROM,
      to: params.to,
      subject: s.subject(params.orderNumber),
      html: wrap(params.language, `
        <h2>${s.greeting(firstName(params.customerName))}</h2>
        <p>${s.body(params.orderNumber)}</p>
        <p>${s.footer}</p>
      `),
    });
  } catch (err) {
    console.error('[email] order in-production notice failed:', err);
  }
}

// ─── In transit (shipped by partner) ────────────────────────────────────────

const IN_TRANSIT_STRINGS: Record<Locale, { subject: (o: string) => string; greeting: (n: string) => string; body: (o: string) => string }> = {
  fr: {
    subject: (o) => `Ta commande ${o} est en cours de livraison — Dropix`,
    greeting: (n) => `Ça arrive, ${n} !`,
    body: (o) => `Ta commande <strong>${o}</strong> a quitté nos ateliers et est en cours de livraison.`,
  },
  en: {
    subject: (o) => `Your order ${o} is on its way — Dropix`,
    greeting: (n) => `It's on its way, ${n}!`,
    body: (o) => `Your order <strong>${o}</strong> has left our workshop and is now being delivered.`,
  },
  ar: {
    subject: (o) => `طلبك ${o} في الطريق إليك — Dropix`,
    greeting: (n) => `إنه قادم، ${n}!`,
    body: (o) => `غادر طلبك <strong>${o}</strong> ورشتنا وهو الآن في طريقه إليك.`,
  },
};

export async function sendOrderInTransitEmail(params: { to: string; orderNumber: string; customerName: string; language: Locale }) {
  const s = IN_TRANSIT_STRINGS[params.language] ?? IN_TRANSIT_STRINGS.fr;
  try {
    await sendMail({
      from: FROM,
      to: params.to,
      subject: s.subject(params.orderNumber),
      html: wrap(params.language, `
        <h2>${s.greeting(firstName(params.customerName))}</h2>
        <p>${s.body(params.orderNumber)}</p>
      `),
    });
  } catch (err) {
    console.error('[email] order in-transit notice failed:', err);
  }
}

// ─── Delivered ───────────────────────────────────────────────────────────────

const DELIVERED_STRINGS: Record<Locale, { subject: (o: string) => string; greeting: (n: string) => string; body: (o: string) => string; thanks: string }> = {
  fr: {
    subject: (o) => `Ta commande ${o} est arrivée — Merci d'avoir choisi Dropix !`,
    greeting: (n) => `Merci ${n} !`,
    body: (o) => `Ta commande <strong>${o}</strong> a été livrée.`,
    thanks: "Merci d'avoir choisi Dropix — tu trouveras en pièce jointe ta fiche de bienvenue avec tes identifiants pour gérer ton QR code personnel.",
  },
  en: {
    subject: (o) => `Your order ${o} has arrived — Thanks for choosing Dropix!`,
    greeting: (n) => `Thanks ${n}!`,
    body: (o) => `Your order <strong>${o}</strong> has been delivered.`,
    thanks: "Thank you for choosing Dropix — you'll find attached your welcome sheet with your login details to manage your personal QR code.",
  },
  ar: {
    subject: (o) => `وصل طلبك ${o} — شكرًا لاختيارك Dropix!`,
    greeting: (n) => `شكرًا ${n}!`,
    body: (o) => `تم تسليم طلبك <strong>${o}</strong>.`,
    thanks: 'شكرًا لاختيارك Dropix — ستجد في المرفقات بطاقة الترحيب الخاصة بك التي تحتوي على بيانات الدخول لإدارة رمز QR الشخصي الخاص بك.',
  },
};

export async function sendOrderDeliveredEmail(params: {
  to: string;
  orderNumber: string;
  customerName: string;
  welcomePdfBuffer: Buffer;
  language: Locale;
}) {
  const s = DELIVERED_STRINGS[params.language] ?? DELIVERED_STRINGS.fr;
  try {
    await sendMail({
      from: FROM,
      to: params.to,
      subject: s.subject(params.orderNumber),
      html: wrap(params.language, `
        <h2>${s.greeting(firstName(params.customerName))}</h2>
        <p>${s.body(params.orderNumber)}</p>
        <p>${s.thanks}</p>
      `),
      attachments: [
        { filename: `${params.orderNumber}_bienvenue.pdf`, content: params.welcomePdfBuffer },
      ],
    });
  } catch (err) {
    console.error('[email] order delivered notice failed:', err);
  }
}

// ─── Checkout email verification code ───────────────────────────────────────
// Unlike the notices above, this one must actually reach the inbox before the
// customer can proceed — callers should NOT fire-and-forget this, and should
// surface a failure to the UI instead of swallowing it.

const VERIFY_CODE_STRINGS: Record<Locale, { subject: string; greeting: string; body: string; expiry: string }> = {
  fr: {
    subject: 'Ton code de vérification — Dropix',
    greeting: 'Confirme ton adresse email',
    body: "Voici ton code pour valider ta commande :",
    expiry: 'Ce code expire dans 10 minutes.',
  },
  en: {
    subject: 'Your verification code — Dropix',
    greeting: 'Confirm your email address',
    body: 'Here is your code to validate your order:',
    expiry: 'This code expires in 10 minutes.',
  },
  ar: {
    subject: 'رمز التحقق الخاص بك — Dropix',
    greeting: 'أكّد عنوان بريدك الإلكتروني',
    body: 'إليك رمزك لتأكيد طلبك:',
    expiry: 'تنتهي صلاحية هذا الرمز خلال 10 دقائق.',
  },
};

export async function sendCheckoutVerificationCode(params: { to: string; code: string; language: Locale }) {
  const s = VERIFY_CODE_STRINGS[params.language] ?? VERIFY_CODE_STRINGS.fr;
  await sendMail({
    from: FROM,
    to: params.to,
    subject: s.subject,
    html: wrap(params.language, `
      <h2>${s.greeting}</h2>
      <p>${s.body}</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0;">${params.code}</p>
      <p style="color:#888;font-size:13px;">${s.expiry}</p>
    `),
  });
}
