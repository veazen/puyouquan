import 'reflect-metadata';
import { writeFileSync } from 'node:fs';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

export function buildOpenApiDocument(app: Parameters<typeof SwaggerModule.createDocument>[0]) {
  const config = new DocumentBuilder()
    .setTitle('Veazen API')
    .setDescription('Anti-counterfeit verification & traceability platform (PROJECT_PLAN §5)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  // §9.3: validate every input; strip unknown fields
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // correct client IPs for rate limiting behind Cloudflare/reverse proxies
  app.set('trust proxy', true);
  // browser callers: dashboard SPA + marketing waitlist form
  app.enableCors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.enableShutdownHooks();

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document);
  if (process.env.EMIT_OPENAPI) {
    // §2.1: OpenAPI to docs/openapi.json, then exit (used by npm run openapi)
    writeFileSync(process.env.EMIT_OPENAPI, `${JSON.stringify(document, null, 2)}\n`);
    await app.close();
    return;
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`Veazen API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
