export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptimeSeconds: number;
  checks: Record<string, { status: 'ok' | 'fail'; detail?: string; latencyMs?: number }>;
}

export type HealthCheck = () => Promise<{ status: 'ok' | 'fail'; detail?: string }>;

/** Aggregate health checks from every subsystem. */
export class HealthChecker {
  private readonly startedAt = Date.now();
  private readonly checks = new Map<string, HealthCheck>();

  register(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  async check(): Promise<HealthStatus> {
    const results: HealthStatus['checks'] = {};
    let overall: HealthStatus['status'] = 'ok';
    for (const [name, fn] of this.checks) {
      const t0 = Date.now();
      try {
        const r = await fn();
        results[name] = { ...r, latencyMs: Date.now() - t0 };
        if (r.status === 'fail') overall = 'degraded';
      } catch (err) {
        results[name] = { status: 'fail', detail: (err as Error).message, latencyMs: Date.now() - t0 };
        overall = 'degraded';
      }
    }
    if (this.checks.size === 0) overall = 'ok';
    return { status: overall, uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000), checks: results };
  }
}
