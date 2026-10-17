import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { json } from "express";
import { AppModule } from "./app.module";
import { webOrigin, trustedProxyIps } from "./http-config";

async function bootstrap() {
  try { process.loadEnvFile?.("../../.env"); } catch { /* platform environment variables take precedence */ }
  const origin=webOrigin();
  const proxies=trustedProxyIps();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.getHttpAdapter().getInstance().set("trust proxy",proxies.length?proxies:false);
  app.use(helmet());
  // Inline image previews are bounded again by schema; all other routes keep their default limit.
  app.use("/v1/media/image-edit", json({ limit: "3mb" }));
  app.enableCors({ origin, credentials: true });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}
void bootstrap();
