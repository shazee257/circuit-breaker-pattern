import { Controller, Get, Param, Query } from '@nestjs/common';
import { DownstreamService } from './downstream.service';

type DemoQuery = {
  productId?: string;
  failInventory?: string;
  failPayment?: string;
  inventoryDelay?: string;
  paymentDelay?: string;
};

@Controller()
export class AppController {
  constructor(private readonly downstreamService: DownstreamService) {}

  @Get()
  home() {
    return {
      message: 'NestJS circuit breaker demo',
      try: [
        'GET /orders/101',
        'GET /orders/101?failInventory=true',
        'GET /orders/101?paymentDelay=3000',
        'GET /circuit-breakers'
      ]
    };
  }

  @Get('orders/:orderId')
  async createOrder(@Param('orderId') orderId: string, @Query() query: DemoQuery) {
    const productId = query.productId ?? 'book-1';
    const [inventory, payment] = await Promise.all([
      this.downstreamService.getInventory(productId, query),
      this.downstreamService.authorizePayment(orderId, query)
    ]);

    return {
      orderId,
      productId,
      status: inventory.available && payment.authorized ? 'CONFIRMED' : 'PENDING_RETRY',
      inventory,
      payment
    };
  }

  @Get('circuit-breakers')
  circuitBreakers() {
    return this.downstreamService.getBreakers();
  }
}
