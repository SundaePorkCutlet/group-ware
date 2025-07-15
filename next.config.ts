import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Vercel 배포 시 정적 생성 문제 해결
  trailingSlash: false,
  output: undefined, // 정적 export 비활성화
};

export default nextConfig;
