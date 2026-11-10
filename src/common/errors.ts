/**
 * Shared error types. Every module throws these (or subclasses) so the
 * app can distinguish retryable failures from permanent ones.
 */
export class SolAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'SolAError';
  }
}

export class ConfigError extends SolAError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', false);
    this.name = 'ConfigError';
  }
}

export class DataUnavailableError extends SolAError {
  constructor(message: string) {
    super(message, 'DATA_UNAVAILABLE', true);
    this.name = 'DataUnavailableError';
  }
}

export class RateLimitError extends SolAError {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message, 'RATE_LIMITED', true);
    this.name = 'RateLimitError';
  }
}

export class ScreeningRejectedError extends SolAError {
  constructor(
    message: string,
    public readonly reasons: string[],
  ) {
    super(message, 'SCREENING_REJECTED', false);
    this.name = 'ScreeningRejectedError';
  }
}
