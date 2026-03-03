import type { CostAdapter } from '../types';
import { OpenAIAdapter } from './openai';
import { GCPBillingAdapter } from './gcp';

/**
 * Central registry of all active cost adapters.
 *
 * To add a new vendor:
 *   1. Create /lib/cost/adapters/my-vendor.ts implementing CostAdapter
 *   2. Import and add it here
 *   That's it — the sync endpoint and UI need no changes.
 */
export const adapters: CostAdapter[] = [
  new OpenAIAdapter(),
  new GCPBillingAdapter(),
];
