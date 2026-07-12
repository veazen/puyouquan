import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // self-contained server bundle for the Docker image (Phase 4 deploy)
  output: 'standalone',
};

export default withNextIntl(nextConfig);
