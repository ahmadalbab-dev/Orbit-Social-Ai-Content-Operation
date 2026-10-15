import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@sma/database";
import { processOneRender } from "@sma/media/worker";
import { createRenderStore } from "./store.js";

const store = createRenderStore(prisma);

async function main() {
  const root = process.env.MEDIA_ROOT;
  if (process.env.MEDIA_RENDER_ENABLED !== "true")
    throw new Error("Media rendering is disabled");
  if (!root || !path.isAbsolute(root))
    throw new Error("Absolute MEDIA_ROOT is required");
  const shutdown = new AbortController();
  process.once("SIGINT", () => shutdown.abort());
  process.once("SIGTERM", () => shutdown.abort());
  await prisma.$connect();
  try {
    while (!shutdown.signal.aborted) {
      try {
        const handled = await processOneRender(store, root, {
          signal: shutdown.signal,
        });
        if (!handled) await delay(2000, undefined, { signal: shutdown.signal });
      } catch {
        if (!shutdown.signal.aborted) {
          console.error("Media worker temporarily unavailable; retrying.");
          await delay(2000, undefined, { signal: shutdown.signal }).catch(
            () => {},
          );
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Media worker could not start. Check private storage and database configuration.",
  );
  process.exitCode = 1;
});
