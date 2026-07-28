import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  try { process.loadEnvFile?.("../../.env"); } catch { /* platform environment variables take precedence */ }
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_URL ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}
void bootstrap();
