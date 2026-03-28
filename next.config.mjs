/** @type {import('next').NextConfig} */
import path from "path"

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
 
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Work around Next.js devtools RSC manifest issues on some setups by stubbing Segment Explorer.
        "next/dist/next-devtools/userspace/app/segment-explorer-node": path.join(
          process.cwd(),
          "lib",
          "next-devtools-stubs",
          "segment-explorer-node.tsx",
        ),
        // Disable the Next.js app dev overlay (devtools) entirely in dev to avoid client-manifest JSON parse issues.
        "next/dist/next-devtools/userspace/app/app-dev-overlay-setup": path.join(
          process.cwd(),
          "lib",
          "next-devtools-stubs",
          "app-dev-overlay-setup.ts",
        ),
      }
    }
    return config
  },
}

export default nextConfig
