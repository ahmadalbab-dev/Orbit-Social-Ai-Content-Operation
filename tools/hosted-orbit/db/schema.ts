import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const oauthState = sqliteTable("oauth_state", {
  hash:text("hash").primaryKey(), userId:text("user_id").notNull(), provider:text("provider").notNull(), browserHash:text("browser_hash").notNull(), expiresAt:integer("expires_at").notNull()
});
export const appCredentials = sqliteTable("app_credentials", {
  id:text("id").primaryKey(), userId:text("user_id").notNull(),provider:text("provider").notNull(),encryptedSecret:text("encrypted_secret").notNull()
});
export const socialAccounts = sqliteTable("social_accounts", {
  id:text("id").primaryKey(),userId:text("user_id").notNull(),platform:text("platform").notNull(),externalId:text("external_id").notNull(),name:text("name").notNull(),accountType:text("account_type"),encryptedToken:text("encrypted_token").notNull(),expiresAt:integer("expires_at").notNull(),connectedAt:integer("connected_at").notNull()
}, table=>[uniqueIndex("social_owner_platform_external").on(table.userId,table.platform,table.externalId)]);
