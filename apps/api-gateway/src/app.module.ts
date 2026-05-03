import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DownstreamService } from './downstream.service';

@Module({
  controllers: [AppController],
  providers: [CircuitBreakerService, DownstreamService]
})
export class AppModule {}
