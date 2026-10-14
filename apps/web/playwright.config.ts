import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests",
  use:{
    baseURL:"http://localhost:3100",
    launchOptions:process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE,args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]} : undefined,
  },
  webServer:{command:"pnpm exec next dev --port 3100",url:"http://localhost:3100",reuseExistingServer:!process.env.CI},
});
