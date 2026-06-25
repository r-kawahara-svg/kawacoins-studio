import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ネイティブバイナリを持つパッケージはバンドル対象外にする
  serverExternalPackages: ["@resvg/resvg-js"],
  // lib/fonts/* (Noto Sans JP WOFF2) をサーバーレス関数バンドルに含める
  outputFileTracingIncludes: {
    "**": ["./lib/fonts/**"],
  },
};

export default nextConfig;
