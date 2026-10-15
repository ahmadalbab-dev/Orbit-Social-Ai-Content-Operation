import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import type { RequestIdentity } from "./security";
import { MediaService } from "./media.service";
type MediaRequest = Request & { identity: RequestIdentity };

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get("status") status() {
    return this.media.status();
  }
  @Post("assets") upload(@Req() request: MediaRequest) {
    return this.media.upload(
      request.identity,
      request,
      request.headers["content-type"],
      request.headers["content-length"],
    );
  }
  @Post("renders") create(@Req() request: MediaRequest, @Body() body: unknown) {
    return this.media.create(request.identity, body);
  }
  @Get("renders") list(@Req() request: MediaRequest) {
    return this.media.list(request.identity.workspaceId);
  }
  @Post("renders/:id/cancel") cancel(
    @Req() request: MediaRequest,
    @Param("id") id: string,
  ) {
    return this.media.cancel(request.identity, id);
  }
  @Get("renders/:id/download")
  @Header("Cache-Control", "private, no-store")
  download(@Req() request: MediaRequest, @Param("id") id: string) {
    return this.media.download(request.identity.workspaceId, id);
  }
}
