const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable in development so HMR isn't competing with the service worker.
  disable: process.env.NODE_ENV === 'development',
  // Don't try to precache server endpoints — they need fresh data.
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      // App shell / Next assets — stale-while-revalidate is the sweet spot.
      urlPattern: /^https?.*\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-static' },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // API responses: NetworkFirst so users see fresh data when online,
      // but the last-known response is still served when offline.
      urlPattern: /\/api\//i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
};

module.exports = withPWA(nextConfig);
