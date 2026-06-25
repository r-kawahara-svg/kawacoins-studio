import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp はデフォルトで Next.js 16 がバンドルするため serverExternalPackages 不要
  // Vercel の Node.js 20 ランタイムで動作確認済み
};

export default nextConfig;
