import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'upload.wikimedia.org' },
      { hostname: 'img.youtube.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
