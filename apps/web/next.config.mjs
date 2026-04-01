/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile local workspace packages
  transpilePackages: ["@integriochat/ui", "@integriochat/utils", "@integriochat/db"],

  // CORS headers for the public chat endpoint (widget embeds on third-party domains)
  async headers() {
    return [
      {
        source: "/api/chat",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },

  // Log request bodies are disabled in production (security rule)
  logging: {
    fetches: {
      fullUrl: process.env["NODE_ENV"] !== "production",
    },
  },

  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ["localhost:3000", "integriochat.com", "*.integriochat.com"],
    },
  },
};

export default nextConfig;
