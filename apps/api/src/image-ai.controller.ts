import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { ImageAiService } from "./image-ai.service";
import type { RequestIdentity } from "./security";

@Controller("media/image-edit")
export class ImageAiController {
  constructor(private readonly images: ImageAiService) {}
  @Get("status") status() { return this.images.status(); }
  @Post() async edit(@Req() request: Request & { identity: RequestIdentity }, @Body() body: unknown, @Res() response: Response) {
    const result = await this.images.edit(request.identity, body);
    response.setHeader("Content-Type", result.contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(Buffer.from(result.bytes));
  }
}
