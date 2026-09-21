import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployment remains possible while legacy modules are brought back under
  // the project-wide type check. Local builds keep type checking by default.
  typescript: {
    ignoreBuildErrors: process.env.CT_SKIP_BUILD_TYPECHECK === "1",
  },
  // The repository has one lockfile per application. Keep Turbopack from
  // treating the frontend directory as part of the Next.js workspace.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
