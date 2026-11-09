import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ais-dev-trzrt6fqt6r6p4kw7ge5ca-11456040753.us-east5.run.app"],
  poweredByHeader: false,
  experimental: process.env.SKIP_NEXT_TYPECHECK === "1" ? { cpus: 1 } : {},
  // Somente para máquinas com pouca memória: rode "npm run typecheck" separadamente. Na Vercel o typecheck do build permanece ativo.
  typescript: { ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === "1" },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
