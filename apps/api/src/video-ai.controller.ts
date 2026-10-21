import { Body, Controller, Header, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { VideoAiService } from "./video-ai.service";
import type { RequestIdentity } from "./security";
@Controller("media/video-plan")
export class VideoAiController {
  constructor(private readonly video: VideoAiService) {}
  @Post() @Header("Cache-Control", "private, no-store") plan(@Req() request: Request & { identity: RequestIdentity }, @Body() body: unknown) { return this.video.plan(request.identity, body); }
}
