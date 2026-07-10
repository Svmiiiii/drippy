// Client-safe locale constants — no server-only imports here, so this can be
// imported from both Server and Client Components.
export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
