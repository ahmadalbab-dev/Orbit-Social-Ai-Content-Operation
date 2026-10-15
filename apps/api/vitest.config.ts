import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({resolve:{alias:{
  "@sma/ai":fileURLToPath(new URL("../../packages/ai/src/index.ts",import.meta.url)),
  "@sma/database":fileURLToPath(new URL("../../packages/database/src/index.ts",import.meta.url)),
  "@sma/types":fileURLToPath(new URL("../../packages/types/src/index.ts",import.meta.url)),
}}});
