import "reflect-metadata";
import { Body, Controller, Post, Req } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { registerImageBodyParser } from "./http-body-parser";

@Controller()
class ParserProbe {
  @Post("workspaces") workspace(@Body() body: unknown) { return body; }
  @Post("media/image-edit") image(@Body() body: { image: string }) { return { length: body.image.length }; }
  @Post("billing/webhook") webhook(@Req() request: { rawBody?: Buffer }) {
    return { raw: request.rawBody?.toString("utf8") };
  }
}

describe("route-scoped image JSON parser", () => {
  it("retains workspace JSON, default size limits and exact webhook raw bytes", async () => {
    const module = await Test.createTestingModule({ controllers: [ParserProbe] }).compile();
    const app = module.createNestApplication({ rawBody: true, logger: false });
    registerImageBodyParser(app);
    app.setGlobalPrefix("v1");
    try {
      await app.listen(0, "127.0.0.1");
      const url = `${await app.getUrl()}/v1`;
      const post = (path: string, body: string) => fetch(`${url}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      const workspace = await post("workspaces", JSON.stringify({ name: "Orbit workspace" }));
      expect(workspace.status).toBe(201);
      expect(await workspace.json()).toEqual({ name: "Orbit workspace" });
      const image = await post("media/image-edit", JSON.stringify({ image: "x".repeat(150_000) }));
      expect(image.status).toBe(201);
      expect(await image.json()).toEqual({ length: 150_000 });
      expect((await post("workspaces", JSON.stringify({ name: "x".repeat(150_000) }))).status).toBe(413);
      expect((await post("media/image-edit", JSON.stringify({ image: "x".repeat(3 * 1024 * 1024) }))).status).toBe(413);
      const raw = '{ "event": "fixture", "amount": 10 }\n';
      const webhook = await post("billing/webhook", raw);
      expect(webhook.status).toBe(201);
      expect(await webhook.json()).toEqual({ raw });
    } finally { await app.close(); }
  });
});
