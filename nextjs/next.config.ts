import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@hello-pangea/dnd',
      'react-big-calendar',
    ],
  },
};

export default nextConfig;
