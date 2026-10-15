import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir:"./tests", use:{ baseURL:"http://localhost:3000" }, webServer:{ command:"pnpm exec next dev --hostname 127.0.0.1", url:"http://localhost:3000", reuseExistingServer:true } });
