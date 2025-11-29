import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'a.fsdn.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.freebiesupply.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost', 
        port: '3000', 
        pathname: '/uploads/**', 
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', 
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // Add your Vercel domain for uploaded images
      {
        protocol: 'https',
        hostname: '*.vercel.app', // This covers all Vercel preview deployments
        pathname: '/uploads/**',
      },
      
    ],
  },
};

export default nextConfig;