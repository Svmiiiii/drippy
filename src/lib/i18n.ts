import { getRequestConfig } from 'next-intl/server';

export const locales = ['fr', 'en', 'ar'] as const;
export const defaultLocale = 'fr';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale ?? defaultLocale}.json`)).default,
}));
