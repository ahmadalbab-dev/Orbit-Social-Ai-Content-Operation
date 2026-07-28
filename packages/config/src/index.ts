import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_DEFAULT_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_FALLBACK_MODEL: z.string().default("gpt-4.1-nano"),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(10),
  AI_REQUEST_MAX_TOKENS: z.coerce.number().int().positive().max(4000).default(1200),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SOCIAL_CONNECTOR_MODE: z.enum(["mock", "live"]).default("mock")
});

export type Environment = z.infer<typeof envSchema>;
export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  return envSchema.parse(input);
}
