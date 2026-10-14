import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  try { process.loadEnvFile?.("../../.env"); } catch { /* platform environment variables take precedence */ }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, bodyParser: false });
  app.useBodyParser("json", { limit: "64kb" });
  app.useBodyParser("urlencoded", { limit: "64kb", extended: false });
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_URL ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), process.env.API_BIND_HOST ?? (process.env.NODE_ENV !== "production" && process.env.AUTH_MODE === "local-demo" ? "127.0.0.1" : "0.0.0.0"));
}
void bootstrap();
