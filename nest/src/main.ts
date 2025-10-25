import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod'

import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.use(cookieParser())
  app.useGlobalPipes(new ZodValidationPipe())

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OpenAPI Schema')
    .setDescription('Prisma-first API schema generated from NestJS + Zod')
    .setVersion('1.0.0')
    .addCookieAuth('refresh_token')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwtAuth',
    )
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  cleanupOpenApiDoc(document)
  SwaggerModule.setup('schema', app, document, {
    jsonDocumentUrl: '/schema/',
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  // Serve JSON schema at /schema/
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/schema/', (req, res) => {
    res.type('application/json').send(document)
  })

  const port = configService.get<number>('PORT', 3000)
  await app.listen(port)
  logger.log(`HTTP server running on port ${port}`)
}

void bootstrap()
