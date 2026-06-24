import type { Config } from 'tailwindcss';

// DESIGN SYSTEM V2 — tokens mapped to Tailwind
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',     // Drippy Purple
        secondary: '#EC4899',   // Drippy Pink
        accent: '#22D3EE',      // Drippy Cyan
        bg: '#0B0F1A',
        surface: '#131A2A',
        'surface-hover': '#1A2236',
        border: '#232B3D',
        'text-secondary': '#A0AEC0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Bebas Neue', 'sans-serif'],
      },
      borderRadius: { sm: '12px', DEFAULT: '16px', lg: '24px', xl: '32px' },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(124,58,237,.25)',
        'glow-md': '0 0 40px rgba(124,58,237,.35)',
        'glow-lg': '0 0 80px rgba(124,58,237,.45)',
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #7C3AED, #EC4899)',
        'gradient-ocean': 'linear-gradient(135deg, #22D3EE, #2563EB)',
        'gradient-galaxy': 'linear-gradient(135deg, #7C3AED, #2563EB, #EC4899)',
      },
      transitionDuration: { DEFAULT: '200ms' },
      screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    },
  },
  plugins: [],
};
export default config;
