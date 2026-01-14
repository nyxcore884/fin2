import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This is required to allow the Next.js dev server to accept requests from the
  // Google Cloud Workstations environment.
  allowedDevOrigins: [
    "*.cloudworkstations.dev",
    "https://6000-firebase-studio-1768146889555.cluster-2nmnojxdmnfh2vwda4kd7uoumu.cloudworkstations.dev",
    "https://9000-firebase-studio-1768146889555.cluster-2nmnojxdmnfh2vwda4kd7uoumu.cloudworkstations.dev"
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    GCP_PROJECT: process.env.GCP_PROJECT,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  },
};
// Trigger rebuild
export default nextConfig;
