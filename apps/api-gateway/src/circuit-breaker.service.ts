import { Injectable } from '@nestjs/common';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type BreakerSnapshot = {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  nextAttemptAt: string | null;
  failureThreshold: number;
  openTimeoutMs: number;
  requestTimeoutMs: number;
};

type BreakerRecord = {
  state: CircuitState;
  failures: number;
  successes: number;
  nextAttemptAt: number | null;
};

type CircuitBreakerOptions = {
  failureThreshold: number;
  openTimeoutMs: number;
  requestTimeoutMs: number;
};

type FallbackFactory<T> = (error: Error, snapshot: BreakerSnapshot) => T | Promise<T>;

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  openTimeoutMs: 10_000,
  requestTimeoutMs: 1_500
};

@Injectable()
export class CircuitBreakerService {
  private readonly circuits = new Map<string, BreakerRecord>();
  private readonly options = DEFAULT_OPTIONS;

  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    fallback: FallbackFactory<T>
  ): Promise<T> {
    const circuit = this.getCircuit(name);

    if (circuit.state === 'OPEN') {
      if (circuit.nextAttemptAt && Date.now() >= circuit.nextAttemptAt) {
        circuit.state = 'HALF_OPEN';
      } else {
        return fallback(
          new Error(`Circuit for ${name} is OPEN. Request was short-circuited.`),
          this.snapshot(name)
        );
      }
    }

    try {
      const result = await this.withTimeout(operation(), this.options.requestTimeoutMs);
      this.recordSuccess(circuit);
      return result;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.recordFailure(circuit);
      return fallback(normalizedError, this.snapshot(name));
    }
  }

  snapshots(): BreakerSnapshot[] {
    return Array.from(this.circuits.keys()).map((name) => this.snapshot(name));
  }

  snapshot(name: string): BreakerSnapshot {
    const circuit = this.getCircuit(name);

    return {
      name,
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      nextAttemptAt: circuit.nextAttemptAt
        ? new Date(circuit.nextAttemptAt).toISOString()
        : null,
      ...this.options
    };
  }

  private getCircuit(name: string): BreakerRecord {
    const existingCircuit = this.circuits.get(name);

    if (existingCircuit) {
      return existingCircuit;
    }

    const newCircuit: BreakerRecord = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      nextAttemptAt: null
    };

    this.circuits.set(name, newCircuit);
    return newCircuit;
  }

  private recordSuccess(circuit: BreakerRecord): void {
    circuit.failures = 0;
    circuit.successes += 1;
    circuit.state = 'CLOSED';
    circuit.nextAttemptAt = null;
  }

  private recordFailure(circuit: BreakerRecord): void {
    circuit.failures += 1;

    if (circuit.state === 'HALF_OPEN' || circuit.failures >= this.options.failureThreshold) {
      circuit.state = 'OPEN';
      circuit.nextAttemptAt = Date.now() + this.options.openTimeoutMs;
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Downstream call took longer than ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }
}
