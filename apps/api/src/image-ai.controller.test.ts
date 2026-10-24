import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { Reflector } from "@nestjs/core";
import { ImageAiController } from "./image-ai.controller";
import type { ImageAiService } from "./image-ai.service";

describe("prompt-only image generation response", () => {
  it("forwards workspace identity and returns private image bytes rather than provider JSON", async () => {
    const identity = {workspaceId: "workspace", userId: "user", sub: "subject", role: "OWNER"};
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const generate = vi.fn().mockResolvedValue({bytes, contentType: "image/png"});
    const controller = new ImageAiController({generate} as unknown as ImageAiService);
    const response = {setHeader: vi.fn(), send: vi.fn()};
    const input = {prompt: "A blue ceramic cup"};
    await controller.generate({identity} as Request & {identity: typeof identity}, input, response as unknown as Response);
    expect(generate).toHaveBeenCalledExactlyOnceWith(identity, input);
    expect(response.setHeader.mock.calls).toEqual([
      ["Content-Type", "image/png"], ["Cache-Control", "private, no-store"], ["X-Content-Type-Options", "nosniff"],
    ]);
    expect(response.send).toHaveBeenCalledExactlyOnceWith(Buffer.from(bytes));
    const reflector = new Reflector();
    expect(reflector.getAllAndOverride("orbit.public", [ImageAiController.prototype.generate, ImageAiController])).toBeUndefined();
    expect(reflector.getAllAndOverride("orbit.identityOnly", [ImageAiController.prototype.generate, ImageAiController])).toBeUndefined();
  });
});
