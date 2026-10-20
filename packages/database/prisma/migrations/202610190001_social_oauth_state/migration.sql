CREATE TABLE "SocialOAuthState" (
 "id" TEXT PRIMARY KEY,
 "workspaceId" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "provider" TEXT NOT NULL,
 "browserHash" TEXT,
 "consumedAt" TIMESTAMP(3),
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SocialOAuthState_expiresAt_idx" ON "SocialOAuthState"("expiresAt");
ALTER TABLE "SocialOAuthState" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SocialOAuthState" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE "SocialOAuthState" FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE "SocialOAuthState" FROM authenticated; END IF;
END $$;
