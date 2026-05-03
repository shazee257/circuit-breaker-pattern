import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { InventoryModule } from './inventory.module';

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);
  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port, '127.0.0.1');
  console.log(`Inventory Service running on http://localhost:${port}`);
}

bootstrap();
