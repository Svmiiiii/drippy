// ============================================================================
// DESIGN SYSTEM V2 — tokens & constants
// ============================================================================

export const colors = {
  primary: '#7C3AED', // Drippy Purple
  secondary: '#EC4899', // Drippy Pink
  accent: '#22D3EE', // Drippy Cyan
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
