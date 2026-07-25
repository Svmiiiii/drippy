// ============================================================================
// DESIGN SYSTEM V2 — tokens & constants
// ============================================================================

export const colors = {
  primary: '#7C3AED', // Dropix Purple
  secondary: '#EC4899', // Dropix Pink
  accent: '#22D3EE', // Dropix Cyan
  bg: '#0B0F1A',
  surface: '#131A2A',
  surfaceHover: '#1A2236',
  border: '#232B3D',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
} as const;

export const gradients = {
  neon: 'linear-gradient(135deg, #7C3AED, #EC4899)',
  ocean: 'linear-gradient(135deg, #22D3EE, #2563EB)',
  sunset: 'linear-gradient(135deg, #EC4899, #F97316)',
  fire: 'linear-gradient(135deg, #EF4444, #F97316)',
  galaxy: 'linear-gradient(135deg, #7C3AED, #2563EB, #EC4899)',
  cyber: 'linear-gradient(135deg, #22D3EE, #7C3AED)',
  midnight: 'linear-gradient(135deg, #0B0F1A, #2563EB)',
  love: 'linear-gradient(135deg, #EC4899, #EF4444)',
  street: 'linear-gradient(135deg, #1a1a1a, #F59E0B)',
  classic: 'linear-gradient(135deg, #1a1a1a, #FFFFFF)',
} as const;

// QR presets (CHAPITRE 39 — Presets QR V1)
export const QR_PRESETS = [
  { id: 'CLASSIC', label: 'Classic', colors: ['#000000', '#FFFFFF'] },
  { id: 'SUNSET', label: 'Sunset', colors: ['#F97316', '#EC4899'] },
  { id: 'OCEAN', label: 'Ocean', colors: ['#2563EB', '#22D3EE'] },
  { id: 'NEON', label: 'Neon', colors: ['#7C3AED', '#EC4899'] },
  { id: 'FIRE', label: 'Fire', colors: ['#EF4444', '#F97316'] },
  { id: 'CYBER', label: 'Cyber', colors: ['#22D3EE', '#7C3AED'] },
  { id: 'MIDNIGHT', label: 'Midnight', colors: ['#0B0F1A', '#2563EB'] },
  { id: 'LOVE', label: 'Love', colors: ['#EC4899', '#EF4444'] },
  { id: 'STREET', label: 'Street', colors: ['#000000', '#F59E0B'] },
  { id: 'GALAXY', label: 'Galaxy', colors: ['#7C3AED', '#2563EB', '#EC4899'] },
] as const;

// Customer-picked custom color (CHAPITRE 39bis — Couleur personnalisée QR).
// Stored as preset id 'CUSTOM' + a hex string, resolved through this helper
// everywhere a preset would otherwise be looked up, so the QR, the flocked
// logo preview, and the server-side print files all stay in sync.
export const CUSTOM_QR_PRESET_ID = 'CUSTOM';
export function getQrColors(preset: string, customColor?: string | null): string[] {
  if (preset === CUSTOM_QR_PRESET_ID && customColor) return [customColor];
  return [...(QR_PRESETS.find((p) => p.id === preset)?.colors ?? QR_PRESETS[3].colors)];
}

// QR text fonts (CHAPITRE 40 — Polices officielles)
export const QR_FONTS = [
  { id: 'Anton', category: 'STREET' },
  { id: 'Bebas Neue', category: 'STREET' },
  { id: 'Montserrat', category: 'PREMIUM' },
  { id: 'Poppins', category: 'PREMIUM' },
  { id: 'Bangers', category: 'FUN' },
  { id: 'Luckiest Guy', category: 'FUN' },
] as const;

// Suggested messages (CHAPITRE 41) — admin proposes, client stays free to write
export const SUGGESTED_MESSAGES = [
  'Scan me for a date 😏',
  'Wanna kiss?',
  'Follow the vibe',
  'My playlist hits different',
  'Tap into my universe',
  'One scan. One surprise.',
  'Curious?',
  'Scan if you dare.',
];

// Order status workflow (DRP-WF-ADM-006)
export const ORDER_FLOW = [
  'confirmed', 'in_production', 'printed', 'flocked', 'packed', 'shipped', 'delivered',
] as const;

export const WILAYAS = [
  '01 - Adrar','02 - Chlef','03 - Laghouat','04 - Oum El Bouaghi','05 - Batna',
  '06 - Béjaïa','07 - Biskra','08 - Béchar','09 - Blida','10 - Bouira',
  '11 - Tamanrasset','12 - Tébessa','13 - Tlemcen','14 - Tiaret','15 - Tizi Ouzou',
  '16 - Alger','17 - Djelfa','18 - Jijel','19 - Sétif','20 - Saïda','21 - Skikda',
  '22 - Sidi Bel Abbès','23 - Annaba','24 - Guelma','25 - Constantine','26 - Médéa',
  '27 - Mostaganem','28 - M\'Sila','29 - Mascara','30 - Ouargla','31 - Oran',
  '32 - El Bayadh','33 - Illizi','34 - Bordj Bou Arréridj','35 - Boumerdès',
  '36 - El Tarf','37 - Tindouf','38 - Tissemsilt','39 - El Oued','40 - Khenchela',
  '41 - Souk Ahras','42 - Tipaza','43 - Mila','44 - Aïn Defla','45 - Naâma',
  '46 - Aïn Témouchent','47 - Ghardaïa','48 - Relizane','49 - Timimoun',
  '50 - Bordj Badji Mokhtar','51 - Ouled Djellal','52 - Béni Abbès','53 - In Salah',
  '54 - In Guezzam','55 - Touggourt','56 - Djanet','57 - El M\'Ghair','58 - El Meniaa',
];

// Frais de livraison par wilaya (DZD)
// Alger + périphérie = 400, Nord = 500, Hauts plateaux = 600, Sud = 800
export const SHIPPING_FEES: Record<string, number> = {
  '16 - Alger': 400, '09 - Blida': 400, '35 - Boumerdès': 400, '42 - Tipaza': 400,
  '02 - Chlef': 500, '06 - Béjaïa': 500, '10 - Bouira': 500, '13 - Tlemcen': 500,
  '14 - Tiaret': 500, '15 - Tizi Ouzou': 500, '17 - Djelfa': 500, '18 - Jijel': 500,
  '19 - Sétif': 500, '20 - Saïda': 500, '21 - Skikda': 500, '22 - Sidi Bel Abbès': 500,
  '23 - Annaba': 500, '24 - Guelma': 500, '25 - Constantine': 500, '26 - Médéa': 500,
  '27 - Mostaganem': 500, '28 - M\'Sila': 500, '29 - Mascara': 500, '31 - Oran': 500,
  '34 - Bordj Bou Arréridj': 500, '36 - El Tarf': 500, '38 - Tissemsilt': 500,
  '40 - Khenchela': 500, '41 - Souk Ahras': 500, '43 - Mila': 500, '44 - Aïn Defla': 500,
  '45 - Naâma': 500, '46 - Aïn Témouchent': 500, '47 - Ghardaïa': 600, '48 - Relizane': 500,
  '04 - Oum El Bouaghi': 500, '05 - Batna': 500,
  '01 - Adrar': 800, '03 - Laghouat': 600, '07 - Biskra': 600, '08 - Béchar': 700,
  '11 - Tamanrasset': 800, '12 - Tébessa': 600, '30 - Ouargla': 700,
  '32 - El Bayadh': 700, '33 - Illizi': 800, '37 - Tindouf': 800, '39 - El Oued': 700,
  '49 - Timimoun': 800, '50 - Bordj Badji Mokhtar': 800, '51 - Ouled Djellal': 700,
  '52 - Béni Abbès': 800, '53 - In Salah': 800, '54 - In Guezzam': 800,
  '55 - Touggourt': 700, '56 - Djanet': 800, '57 - El M\'Ghair': 700, '58 - El Meniaa': 700,
};

export function getShippingFee(wilaya: string): number {
  return SHIPPING_FEES[wilaya] ?? 500;
}

// Garment sizes have no natural alphabetical order (L < M < S < XL < XS
// lexicographically, which is nonsense for clothing) — always render size
// lists through this instead of relying on whatever order the DB returns.
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
