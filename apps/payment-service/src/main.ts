import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  const port = Number(process.env.PORT ?? 3002);

  await app.listen(port, '127.0.0.1');
  console.log(`Payment Service running on http://localhost:${port}`);
}

bootstrap();
