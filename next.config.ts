import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // NOTE: Cannot use output: 'export' because Server Actions (AI features)
  // require a server. Tauri uses devUrl to proxy the Next.js server instead.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
