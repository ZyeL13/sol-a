import pino from 'pino';
import { env } from '../config/config';

/** Structured JSON logging (pino). No pretty transport in production code paths. */
export const logger = pino({ level: env.LOG_LEVEL, base: { service: 'sol-a' } });

export type Logger = typeof logger;
