import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Parent folder has another package-lock.json; pin this app as the root
  // so Next does not mix two node_modules trees (causes Turbopack HMR crashes).
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  // Avoid bundling firebase-admin (pulls jwks-rsa → jose ESM conflict on Vercel/Node 22)
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static-01.daraz.pk" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
