/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.E2E_LOCAL_SUPABASE ? ".next/e2e" : ".next",
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  experimental: {
    instantInsights: {
      validationLevel: "warning"
    }
  }
};

export default nextConfig;
