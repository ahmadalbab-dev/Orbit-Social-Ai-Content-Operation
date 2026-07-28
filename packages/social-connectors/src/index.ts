import type { PublishRequest, PublishResult, SocialPlatform } from "@sma/types";

export interface SocialConnector {
  readonly platform: SocialPlatform;
  getAuthorizationUrl(state: string): Promise<string>;
  exchangeCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  publish(request: PublishRequest): Promise<PublishResult>;
  fetchAnalytics(externalPostId: string): Promise<Record<string, number>>;
}

export class MockConnector implements SocialConnector {
  constructor(readonly platform: SocialPlatform) {}
  async getAuthorizationUrl(state: string) { return `https://example.invalid/oauth/${this.platform}?state=${encodeURIComponent(state)}`; }
  async exchangeCode() { return { accessToken: "mock-token", expiresAt: new Date(Date.now() + 3600000) }; }
  async publish(request: PublishRequest): Promise<PublishResult> {
    return { status: "published", externalId: `mock_${request.platform}_${request.idempotencyKey.slice(0, 12)}`, externalUrl: `https://example.invalid/${request.platform}/post/${request.idempotencyKey}`, publishedAt: new Date().toISOString() };
  }
  async fetchAnalytics() { return { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }; }
}

export class ConnectorRegistry {
  private readonly connectors = new Map<SocialPlatform, SocialConnector>();
  register(connector: SocialConnector) { this.connectors.set(connector.platform, connector); return this; }
  get(platform: SocialPlatform) {
    const connector = this.connectors.get(platform);
    if (!connector) throw new Error(`Connector not configured: ${platform}`);
    return connector;
  }
}
