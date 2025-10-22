import { writeFileSync } from 'fs';
import { join } from 'path';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from '~/app.module';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
}
process.env.SKIP_PRISMA_CONNECT = 'true';
process.env.JWT_SECRET ??= 'change-me';

async function generateOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const config = new DocumentBuilder()
    .setTitle('OpenAPI Schema')
    .setDescription('Prisma-driven NestJS API schema')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwtAuth',
    )
    .addCookieAuth('refresh_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  cleanupOpenApiDoc(document);
  const outputPath = join(process.cwd(), '..', 'next', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`OpenAPI schema written to ${outputPath}`);
}

generateOpenApi().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
