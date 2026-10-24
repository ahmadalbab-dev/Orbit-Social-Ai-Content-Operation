import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({ resolve: { alias: { "@sma/ai": resolve(__dirname, "../../packages/ai/src/index.ts"), "@sma/types": resolve(__dirname, "../../packages/types/src/index.ts"), "@sma/social-connectors": resolve(__dirname, "../../packages/social-connectors/src/index.ts") } } });
