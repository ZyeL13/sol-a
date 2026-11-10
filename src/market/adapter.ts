import type { MarketEvent } from '../common/eventBus';
import type { DiscoveryEventPayload } from './types';

/** A source of raw discovery events. Adapters translate provider data into normalized events. */
export interface MarketDataAdapter {
  readonly name: string;
  /** Start streaming; call the callback for every normalized event. */
  start(onEvent: (event: MarketEvent<DiscoveryEventPayload>) => void): Promise<void>;
  stop(): Promise<void>;
}

/** Build a deterministic event id for deduplication. */
export function discoveryEventId(kind: string, mint: string, slotOrTs: string | number): string {
  return `discovery:${kind}:${mint}:${slotOrTs}`;
}
