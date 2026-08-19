/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    instantInsights: {
      validationLevel: "warning"
    }
  }
};

export default nextConfig;
