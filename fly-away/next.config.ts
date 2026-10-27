import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

// 1. Initialize next-pwa with your specific caching guidelines
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",

  // FIXED: Changed capital 'B' to lowercase 'b' to stop the Webpack crash
  fallbacks: {
    document: "/~offline",
  },

  runtimeCaching: [
    {
      // Caches your Supabase flight queries safely for 30 minutes
      urlPattern:
        /^https:\/\/qtqyxfvfgladmvrupyef\.supabase\.co\/rest\/v1\/flights/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "flight-search-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 30, // 30 minutes
        },
      },
    },
    {
      // Aggressive caching for static UI assets
      urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|woff2)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
});

// 2. Define your standard Next.js configurations
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // This small block signals to Next.js that you're using custom Webpack
  // features, preventing Turbopack from running and crashing the production build.
  webpack: (config) => {
    return config;
  },
};

// 3. Wrap your configuration and export it
export default withPWA(nextConfig);
