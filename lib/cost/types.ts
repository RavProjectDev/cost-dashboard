/**
 * The canonical shape every adapter must produce.
 * All vendor-specific fields get normalized into this structure
 * before being written to cost_events.
 */
export interface NormalizedCostEvent {
  vendor: string;
  service: string;
  timestamp: Date;
  cost_usd: number;
  usage_quantity?: number;
  usage_unit?: string;
  project_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Every vendor adapter implements this interface.
 * Adding a new vendor = creating a new file in /lib/cost/adapters/
 * and registering it in registry.ts — nothing else changes.
 */
export interface CostAdapter {
  readonly name: string;
  fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]>;
}
