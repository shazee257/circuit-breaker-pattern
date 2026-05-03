import { Controller, Get, Param, Query } from '@nestjs/common';

type InventoryResponse = {
  service: 'inventory-service';
  productId: string;
  available: boolean;
  remainingStock: number;
};

function randomFailure(rate: number): boolean {
  return Math.random() < rate;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

@Controller()
export class InventoryController {
  @Get('health')
  health() {
    return { service: 'inventory-service', status: 'ok' };
  }

  @Get('inventory/:productId')
  async getInventory(
    @Param('productId') productId: string,
    @Query('fail') fail?: string,
    @Query('delay') delay?: string
  ): Promise<InventoryResponse> {
    const failureRate = Number(process.env.FAILURE_RATE ?? 0.35);
    const forcedFailure = fail === 'true';
    const artificialDelay = Number(delay ?? process.env.DELAY_MS ?? 200);

    await sleep(artificialDelay);

    if (forcedFailure || randomFailure(failureRate)) {
      throw new Error('Inventory database is temporarily unavailable');
    }

    return {
      service: 'inventory-service',
      productId,
      available: true,
      remainingStock: 12
    };
  }
}
