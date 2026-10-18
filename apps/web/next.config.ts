import path from "node:path";
import type { NextConfig } from "next";
const config: NextConfig = {
  // Avoid covering editor tools in local acceptance; compile/runtime errors still surface.
  devIndicators: false,
  output: process.platform === "win32" ? undefined : "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@sma/ui"]
};
export default config;
