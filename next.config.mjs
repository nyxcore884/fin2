/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        allowedDevOrigins: ["https://9000-firebase-studio-1768146889555.cluster-2nmnojxdmnfh2vwda4kd7uoumu.cloudworkstations.dev"]
    },
    env: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    }
};

export default nextConfig;
