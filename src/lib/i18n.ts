import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from './locale-config';

export { locales, defaultLocale, LOCALE_COOKIE };
export type { Locale };

export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return (locales as readonly string[]).includes(value ?? '') ? (value as Locale) : defaultLocale;
}

// No URL-based routing — the locale is resolved from a cookie so the user
// can switch language on any page without the URL changing.
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
