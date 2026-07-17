import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg (and the Prisma adapter built on it) ships optional requires for
  // pg-native and cloudflare:sockets that don't exist in a normal Node.js
  // serverless function - letting Next.js's bundler try to statically
  // analyze/bundle them is exactly the kind of thing that surfaces as
  // "pg driver" build errors. serverExternalPackages tells Next.js to
  // require() these at runtime instead of bundling them, which is the
  // current, bundler-agnostic (works under both Webpack and Turbopack)
  // way to handle this - the older per-bundler workarounds (a webpack()
  // IgnorePlugin config) don't apply here since Turbopack doesn't run
  // that hook at all, and Next 16 defaults to Turbopack.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
};

export default nextConfig;
