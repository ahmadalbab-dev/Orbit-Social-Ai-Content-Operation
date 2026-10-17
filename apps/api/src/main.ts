import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { registerImageBodyParser } from "./http-body-parser";
import { AppModule } from "./app.module";
import { webOrigin, trustedProxyIps } from "./http-config";

async function bootstrap() {
  try { process.loadEnvFile?.("../../.env"); } catch { /* platform environment variables take precedence */ }
  const origin=webOrigin();
  const proxies=trustedProxyIps();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.getHttpAdapter().getInstance().set("trust proxy",proxies.length?proxies:false);
  app.use(helmet());
  registerImageBodyParser(app);
  app.enableCors({ origin, credentials: true });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
}
void bootstrap();
