/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
    ],
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
    ],
  },
};

export default nextConfig;