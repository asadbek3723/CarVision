/**
 * CarVision AI Circuit Breaker
 * Protects credit balance and fails fast during external provider outages.
 */

export class FalCircuitBreaker {
  private static instance: FalCircuitBreaker;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly cooldownPeriodMs = 45000; // 45 seconds

  public static getInstance(): FalCircuitBreaker {
    if (!FalCircuitBreaker.instance) {
      FalCircuitBreaker.instance = new FalCircuitBreaker();
    }
    return FalCircuitBreaker.instance;
  }

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(
        `[CIRCUIT BREAKER TRIPPED] Fal.ai experienced ${this.consecutiveFailures} consecutive failures. Transitioned to OPEN state.`
      );
    }
  }

  public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }
}
