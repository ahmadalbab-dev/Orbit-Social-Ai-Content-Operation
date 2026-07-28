export const socialPlatforms = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "x", "threads", "pinterest"] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export type PublishRequest = {
  idempotencyKey: string;
  workspaceId: string;
  platform: SocialPlatform;
  accountId: string;
  text: string;
  mediaUrls?: string[];
  scheduledFor?: string;
};
export type PublishResult = {
  status: "published" | "failed";
  externalId?: string;
  externalUrl?: string;
  error?: string;
  publishedAt?: string;
};
export type ContentVariant = {
  platform: SocialPlatform;
  copy: string;
  hashtags: string[];
  callToAction: string;
};
