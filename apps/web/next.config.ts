import path from "node:path";
import type { NextConfig } from "next";
const config: NextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@sma/ui"]
};
export default config;
