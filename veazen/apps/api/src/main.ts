import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`Veazen API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
