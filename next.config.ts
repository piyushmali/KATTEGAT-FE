import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Type errors fail the build. Next 16 no longer runs ESLint as part of
  // `next build`, so linting is its own gate — see the `lint` script.
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // No camera/mic/geolocation is used anywhere in the product.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
