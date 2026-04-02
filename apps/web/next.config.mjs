/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile local workspace packages
  transpilePackages: ["@integriochat/ui", "@integriochat/utils", "@integriochat/db"],

  // CORS headers for the public chat endpoint (widget embeds on third-party domains)
  async headers() {
    const corsHeaders = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type" },
      { key: "Access-Control-Max-Age", value: "86400" },
    ];
    return [
      { source: "/api/chat", headers: corsHeaders },
      { source: "/api/chat/config", headers: corsHeaders },
      { source: "/api/leads", headers: corsHeaders },
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
