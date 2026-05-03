import { Controller, Get, Param, Query } from '@nestjs/common';

type PaymentResponse = {
  service: 'payment-service';
  orderId: string;
  authorized: boolean;
  authorizationCode: string;
};

function randomFailure(rate: number): boolean {
  return Math.random() < rate;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

@Controller()
export class PaymentController {
  @Get('health')
  health() {
    return { service: 'payment-service', status: 'ok' };
  }

  @Get('payments/authorize/:orderId')
  async authorizePayment(
    @Param('orderId') orderId: string,
    @Query('fail') fail?: string,
    @Query('delay') delay?: string
  ): Promise<PaymentResponse> {
    const failureRate = Number(process.env.FAILURE_RATE ?? 0.25);
    const forcedFailure = fail === 'true';
    const artificialDelay = Number(delay ?? process.env.DELAY_MS ?? 250);

    await sleep(artificialDelay);

    if (forcedFailure || randomFailure(failureRate)) {
      throw new Error('Payment provider timed out');
    }

    return {
      service: 'payment-service',
      orderId,
      authorized: true,
      authorizationCode: `AUTH-${Date.now()}`
    };
  }
}
