import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  env: {
    DOORKEEPER_API_TOKEN: process.env.DOORKEEPER_API_TOKEN ?? "",
    LUMA_API_KEY: process.env.LUMA_API_KEY ?? "",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
