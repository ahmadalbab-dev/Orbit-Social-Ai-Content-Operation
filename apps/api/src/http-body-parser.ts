import type { INestApplication } from "@nestjs/common";
import { json } from "express";

/** Keep Nest's global JSON parser and webhook raw-body capture enabled. */
export function registerImageBodyParser(app: INestApplication) {
  const imageJson = json({ limit: "3mb" });
  // Nest skips its global parser if ANY mounted middleware is named jsonParser.
  // Wrap this route-only parser so normal routes still receive the default parser.
  app.use(["/v1/media/image-edit", "/v1/media/editor-plan"], (
    request: Parameters<typeof imageJson>[0],
    response: Parameters<typeof imageJson>[1],
    next: Parameters<typeof imageJson>[2],
  ) => imageJson(request, response, next));
}
