const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // production.ts reads bundled .ttf files and the Drippy logo mask/text
  // PNGs at runtime via fs.readFileSync(path.join(process.cwd(), ...)),
  // which Vercel's build-time file tracer can't always resolve statically
  // — force-include them so image generation doesn't 500 in production
  // from a missing font/logo asset.
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/lib/fonts/**', './public/logos/**'],
  },
  // The project lives under ~/Desktop, which iCloud Drive syncs — its file
  // provider intercepts the atomic rename webpack's persistent disk cache
  // relies on (.next/cache/webpack/*.pack.gz_ -> *.pack.gz), throwing ENOENT
  // and corrupting the dev server until every route 404s. Disabling the
  // filesystem cache in dev mode avoids that rename entirely (slightly
  // slower rebuilds, but no more stuck server needing manual .next wipes).
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
