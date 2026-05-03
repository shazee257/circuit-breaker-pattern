# NestJS Circuit Breaker Pattern in Microservices

This is a small learning project that shows the circuit breaker pattern with three
NestJS apps:

- `api-gateway` on port `3000`
- `inventory-service` on port `3001`
- `payment-service` on port `3002`

The API gateway calls the two downstream services. When one service fails several
times, the gateway opens that service's circuit and immediately returns a fallback
response instead of continuing to call the unhealthy service.

## Why Circuit Breakers Help

Circuit breakers protect a system from repeatedly calling a failing dependency.
They work like an electrical circuit breaker:

1. `CLOSED`: requests flow normally.
2. `OPEN`: calls are blocked because the dependency failed too many times.
3. `HALF_OPEN`: after a short wait, one trial request is allowed.
4. If the trial succeeds, the breaker closes. If it fails, the breaker opens again.

## Advantages

- Prevents cascading failures across microservices.
- Reduces load on unhealthy services so they have time to recover.
- Gives users faster fallback responses instead of slow timeouts.
- Makes failure behavior visible and easier to monitor.
- Improves overall system resilience.
- Keeps one bad dependency from blocking the whole request flow.

## Project Structure

```text
apps/
  api-gateway/
    src/
      app.controller.ts
      circuit-breaker.service.ts
      downstream.service.ts
  inventory-service/
    src/
      inventory.controller.ts
  payment-service/
    src/
      payment.controller.ts
```

The main learning file is:

```text
apps/api-gateway/src/circuit-breaker.service.ts
```

## Install

```bash
npm install
```

## Run

Open three terminals:

```bash
npm run dev:inventory
```

```bash
npm run dev:payment
```

```bash
npm run dev:gateway
```

## Try It

Normal request:

```bash
curl http://localhost:3000/orders/101
```

Force inventory failures:

```bash
curl "http://localhost:3000/orders/101?failInventory=true"
```

Run that command three times. The inventory circuit will move to `OPEN`, and
later requests will be short-circuited by the gateway.

Force payment timeout:

```bash
curl "http://localhost:3000/orders/101?paymentDelay=3000"
```

Check circuit states:

```bash
curl http://localhost:3000/circuit-breakers
```

## Circuit Breaker Settings

The demo uses these simple defaults:

```ts
failureThreshold: 3
openTimeoutMs: 10000
requestTimeoutMs: 1500
```

Meaning:

- After `3` failed calls, the circuit opens.
- It stays open for `10` seconds.
- Any downstream call taking more than `1.5` seconds is treated as failed.

## Demo Service Failure Controls

The downstream services fail randomly by default so you can observe the breaker.
You can change the failure rate while starting each service:

```bash
FAILURE_RATE=0 npm run dev:inventory
FAILURE_RATE=0 npm run dev:payment
```

Or force failures from the gateway request:

```bash
curl "http://localhost:3000/orders/101?failInventory=true"
curl "http://localhost:3000/orders/101?failPayment=true"
```

## What To Notice

When a service fails, the gateway still responds. It returns fallback data and
includes the breaker state in the response. This makes the behavior easy to see:

```json
{
  "fromFallback": true,
  "fallbackReason": "Circuit for inventory-service is OPEN. Request was short-circuited.",
  "breaker": {
    "name": "inventory-service",
    "state": "OPEN"
  }
}
```

That is the key idea: do not keep waiting on something that is already unhealthy.
