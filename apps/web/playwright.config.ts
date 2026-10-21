import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:3000" },
  // Acceptance runs the deployed build behavior without development HMR reloads.
  webServer: {
    command: "pnpm exec next build && pnpm exec next start --hostname 127.0.0.1",
    timeout: 180000,
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_URL: "https://api.orbit.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://auth.orbit.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_browser_fixture",
    },
  },
});
