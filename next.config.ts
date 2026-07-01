import type { NextConfig } from "next";

// Supabase Storage 공개 URL(next/image 원격 이미지 최적화 허용 대상)의 호스트명을
// 환경 변수에서 파싱한다 — 환경마다 프로젝트 URL이 달라도 하드코딩 없이 대응
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
