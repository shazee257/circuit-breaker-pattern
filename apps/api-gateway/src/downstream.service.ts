import { Injectable } from '@nestjs/common';
import { BreakerSnapshot, CircuitBreakerService } from './circuit-breaker.service';

type Inventory = {
  service: string;
  productId: string;
  available: boolean;
  remainingStock: number;
};

type Payment = {
  service: string;
  orderId: string;
  authorized: boolean;
  authorizationCode: string;
};

type FallbackEnvelope<T> = T & {
  fromFallback: true;
  fallbackReason: string;
  breaker: BreakerSnapshot;
};

type DemoQuery = {
  failInventory?: string;
  failPayment?: string;
  inventoryDelay?: string;
  paymentDelay?: string;
};

@Injectable()
export class DownstreamService {
  private readonly inventoryUrl =
    process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3001';

  private readonly paymentUrl =
    process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  getBreakers() {
    return this.circuitBreaker.snapshots();
  }

  async getInventory(
    productId: string,
    query: DemoQuery
  ): Promise<Inventory | FallbackEnvelope<Inventory>> {
    return this.circuitBreaker.execute(
      'inventory-service',
      () => this.fetchJson<Inventory>(this.inventoryEndpoint(productId, query)),
      (error, breaker) => ({
        service: 'inventory-service',
        productId,
        available: false,
        remainingStock: 0,
        fromFallback: true,
        fallbackReason: error.message,
        breaker
      })
    );
  }

  async authorizePayment(
    orderId: string,
    query: DemoQuery
  ): Promise<Payment | FallbackEnvelope<Payment>> {
    return this.circuitBreaker.execute(
      'payment-service',
      () => this.fetchJson<Payment>(this.paymentEndpoint(orderId, query)),
      (error, breaker) => ({
        service: 'payment-service',
        orderId,
        authorized: false,
        authorizationCode: 'PAYMENT-SKIPPED',
        fromFallback: true,
        fallbackReason: error.message,
        breaker
      })
    );
  }

  private inventoryEndpoint(productId: string, query: DemoQuery): string {
    const url = new URL(`/inventory/${productId}`, this.inventoryUrl);

    if (query.failInventory) {
      url.searchParams.set('fail', query.failInventory);
    }

    if (query.inventoryDelay) {
      url.searchParams.set('delay', query.inventoryDelay);
    }

    return url.toString();
  }

  private paymentEndpoint(orderId: string, query: DemoQuery): string {
    const url = new URL(`/payments/authorize/${orderId}`, this.paymentUrl);

    if (query.failPayment) {
      url.searchParams.set('fail', query.failPayment);
    }

    if (query.paymentDelay) {
      url.searchParams.set('delay', query.paymentDelay);
    }

    return url.toString();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status} from ${url}: ${body}`);
    }

    return (await response.json()) as T;
  }
}
