/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  experimental: {
    instantInsights: {
      validationLevel: "warning"
    }
  }
};

export default nextConfig;
