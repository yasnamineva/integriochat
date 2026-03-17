/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile local workspace packages
  transpilePackages: ["@integriochat/ui", "@integriochat/utils", "@integriochat/db"],

  // Log request bodies are disabled in production (security rule)
  logging: {
    fetches: {
      fullUrl: process.env["NODE_ENV"] !== "production",
    },
  },

  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
