import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '127.0.0.1');
  console.log(`API Gateway running on http://localhost:${port}`);
}

bootstrap();
