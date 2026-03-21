import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@hello-pangea/dnd',
      'react-big-calendar',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/supabase/auth/v1/:path*',
        destination: `${supabaseUrl}/auth/v1/:path*`,
      },
      {
        source: '/supabase/rest/v1/:path*',
        destination: `${supabaseUrl}/rest/v1/:path*`,
      },
      {
        source: '/supabase/storage/v1/:path*',
        destination: `${supabaseUrl}/storage/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
