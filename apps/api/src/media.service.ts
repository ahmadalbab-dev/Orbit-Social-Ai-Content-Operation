import { BillingService } from "./billing.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  StreamableFile,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import type { Readable } from "node:stream";
import { Prisma, type MediaRender } from "@sma/database";
import { validateRenderJob } from "@sma/media";
import { z } from "zod";
import { DatabaseService } from "./database.service";
import type { RequestIdentity } from "./security";
import { requireRole } from "./workflow.service";
import {
  MAX_UPLOAD_BYTES,
  WORKSPACE_UPLOAD_BYTES,
  MIME_EXTENSIONS,
  workspaceMediaRoot,
  storeVideo,
  mediaPath,
} from "./media-storage";

const captionSchema = z
  .object({
    text: z.string().min(1).max(120),
    start: z.number().min(0),
    end: z.number().positive(),
  })
  .strict();
const renderSchema = z
  .object({
    assetId: z.string().uuid(),
    start: z.number().min(0).max(86400).default(0),
    duration: z.number().min(0.1).max(120),
    format: z.enum(["portrait", "square", "landscape"]),
    news: z
      .object({
        title: z.string().trim().min(1).max(100),
        date: z.string().trim().min(1).max(40),
      })
      .strict()
      .optional(),
    captions: z.array(captionSchema).max(100).optional(),
  })
  .strict();
function present(job: MediaRender) {
  return {
    id: job.id,
    status: job.status,
    errorCode: job.errorCode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
@Injectable()
export class MediaService {
  constructor(private readonly db: DatabaseService, private readonly billing: BillingService) {}

  status() {
    return {
      configured:
        process.env.MEDIA_RENDER_ENABLED === "true" &&
        Boolean(process.env.MEDIA_ROOT),
      limits: { uploadBytes: MAX_UPLOAD_BYTES, maxDuration: 120 },
      storage: "private-volume",
      workerReadiness: "not-probed",
    };
  }
  private async root(workspaceId: string) {
    if (!this.status().configured)
      throw new ServiceUnavailableException(
        "Media rendering is not configured by the workspace operator",
      );
    try {
      return await workspaceMediaRoot(process.env.MEDIA_ROOT!, workspaceId);
    } catch {
      throw new ServiceUnavailableException(
        "Private media storage is unavailable",
      );
    }
  }
  async upload(
    identity: RequestIdentity,
    stream: Readable,
    contentType: unknown,
    contentLength: unknown,
  ) {
    requireRole(identity);
    if (
      typeof contentType !== "string" ||
      !Object.hasOwn(MIME_EXTENSIONS, contentType)
    )
      throw new BadRequestException("Choose an MP4, MOV or WebM video");
    if (typeof contentLength !== "string" || !/^\d+$/.test(contentLength))
      throw new BadRequestException("Upload size is required");
    const bytes = Number(contentLength);
    if (!Number.isSafeInteger(bytes) || bytes < 12 || bytes > MAX_UPLOAD_BYTES)
      throw new BadRequestException("Video must be under 100 MB");
    await this.billing.requirePaidAccess(identity.workspaceId);
    const root = await this.root(identity.workspaceId);
    const reserved = await this.db.workspace.updateMany({
      where: {
        id: identity.workspaceId,
        mediaBytes: { lte: WORKSPACE_UPLOAD_BYTES - bytes },
      },
      data: { mediaBytes: { increment: bytes } },
    });
    if (!reserved.count)
      throw new ForbiddenException("Workspace video storage allowance reached");
    let stored: Awaited<ReturnType<typeof storeVideo>> | undefined;
    let retain = false;
    try {
      stored = await storeVideo(
        stream,
        root,
        contentType as keyof typeof MIME_EXTENSIONS,
        bytes,
      );
      const duplicate = await this.db.mediaAsset.findUnique({
        where: {
          workspaceId_checksum: {
            workspaceId: identity.workspaceId,
            checksum: stored.checksum,
          },
        },
      });
      if (duplicate)
        return {
          id: duplicate.id,
          mimeType: duplicate.mimeType,
          bytes: duplicate.bytes,
        };
      let asset;
      // Once a DB write is dispatched, a lost reply does not prove rollback.
      // Preserve private bytes and the quota reservation on ambiguous errors.
      retain = true;
      try {
        asset = await this.db.mediaAsset.create({
          data: {
            id: randomUUID(),
            workspaceId: identity.workspaceId,
            storageProvider: "local-private",
            storageKey: stored.key,
            url: "",
            mimeType: contentType,
            bytes,
            checksum: stored.checksum,
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw new ServiceUnavailableException(
            "Upload confirmation unavailable. Retry later; private bytes remain reserved",
          );
        }
        retain = false;
        asset = await this.db.mediaAsset.findUniqueOrThrow({
          where: {
            workspaceId_checksum: {
              workspaceId: identity.workspaceId,
              checksum: stored.checksum,
            },
          },
        });
        return { id: asset.id, mimeType: asset.mimeType, bytes: asset.bytes };
      }
      retain = true;
      return { id: asset.id, mimeType: asset.mimeType, bytes: asset.bytes };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      throw new BadRequestException(
        "Video upload did not complete. Check the file and retry",
      );
    } finally {
      if (!retain) {
        if (stored) await rm(stored.filename, { force: true });
        await this.db.workspace.updateMany({
          where: { id: identity.workspaceId },
          data: { mediaBytes: { decrement: bytes } },
        });
      }
    }
  }
  async create(identity: RequestIdentity, input: unknown) {
    requireRole(identity);
    const parsed = renderSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException("Invalid video render settings");
    const { assetId, ...options } = parsed.data;
    // The same renderer validation is applied before the durable job is charged.
    try {
      validateRenderJob({
        ...options,
        input: "uploads/source.mp4",
        output: "exports/result.mp4",
      });
    } catch {
      throw new BadRequestException("Invalid video render settings");
    }
    await this.billing.requirePaidAccess(identity.workspaceId);
    await this.root(identity.workspaceId);
    return this.db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findFirst({
        where: {
          id: assetId,
          workspaceId: identity.workspaceId,
          storageProvider: "local-private",
        },
      });
      if (!asset)
        throw new NotFoundException("Video not found in this workspace");
      const slot = await tx.workspace.updateMany({
        where: { id: identity.workspaceId, mediaRenderSlots: { gt: 0 } },
        data: { mediaRenderSlots: { decrement: 1 } },
      });
      if (!slot.count)
        throw new ForbiddenException(
          "Workspace alpha render allowance reached",
        );
      const job = await tx.mediaRender.create({
        data: {
          workspaceId: identity.workspaceId,
          assetId,
          options: options as Prisma.InputJsonValue,
        },
      });
      return present(job);
    });
  }
  async list(workspaceId: string) {
    return (
      await this.db.mediaRender.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    ).map(present);
  }
  async cancel(identity: RequestIdentity, id: string) {
    requireRole(identity);
    const job = await this.db.mediaRender.findFirst({
      where: { id, workspaceId: identity.workspaceId },
    });
    if (!job) throw new NotFoundException("Render not found");
    if (["QUEUED", "PROCESSING"].includes(job.status)) {
      const result = await this.db.mediaRender.updateMany({
        where: {
          id,
          workspaceId: identity.workspaceId,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        data: { status: "CANCELLED", errorCode: null },
      });
      if (!result.count)
        throw new ConflictException("Render changed. Refresh its status");
      return present({ ...job, status: "CANCELLED", updatedAt: new Date() });
    }
    return present(job);
  }
  async download(workspaceId: string, id: string) {
    const job = await this.db.mediaRender.findFirst({
      where: { id, workspaceId },
    });
    if (!job) throw new NotFoundException("Render not found");
    if (job.status !== "SUCCEEDED" || !job.outputKey)
      throw new ConflictException("MP4 is not ready to download");
    const root = await this.root(workspaceId);
    try {
      const filename = await mediaPath(root, job.outputKey, "export");
      const file = await stat(filename);
      if (!file.isFile() || file.size > 64 * 1024 * 1024)
        throw Error("Invalid output");
      return new StreamableFile(createReadStream(filename), {
        type: "video/mp4",
        disposition: 'attachment; filename="orbit-video.mp4"',
        length: file.size,
      });
    } catch {
      throw new NotFoundException(
        "Rendered file unavailable. Ask the workspace operator",
      );
    }
  }
}
