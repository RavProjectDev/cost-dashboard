import type { CostAdapter, NormalizedCostEvent } from '../types';

/**
 * OpenAI cost adapter.
 *
 * With a valid OPENAI_API_KEY it calls the OpenAI Usage API.
 * Without one (or when OPENAI_API_KEY="mock") it returns realistic
 * mock data — so the dashboard works out of the box without credentials.
 *
 * Real API reference:
 *   GET https://api.openai.com/v1/usage?date=YYYY-MM-DD
 */
export class OpenAIAdapter implements CostAdapter {
  readonly name = 'openai';
  private readonly apiKey: string;

  constructor(apiKey = process.env.OPENAI_API_KEY ?? '') {
    this.apiKey = apiKey;
  }

  async fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    const useMock = !this.apiKey || this.apiKey === 'mock';
    if (useMock) return this.mockCosts(start, end);

    try {
      return await this.fetchRealCosts(start, end);
    } catch (err) {
      console.warn('[OpenAIAdapter] API call failed, using mock data:', err);
      return this.mockCosts(start, end);
    }
  }

  // ---------------------------------------------------------------------------
  // Real implementation (requires OPENAI_API_KEY)
  // ---------------------------------------------------------------------------

  private async fetchRealCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    const events: NormalizedCostEvent[] = [];
    const current = new Date(start);

    // Usage API returns one day at a time; iterate over the range
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const res = await fetch(`https://api.openai.com/v1/usage?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        next: { revalidate: 0 },
      });

      if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as {
        data?: Array<{
          snapshot_id?: string;
          aggregation_timestamp?: number;
          n_context_tokens_total?: number;
          n_generated_tokens_total?: number;
          total_usage?: number; // cents
        }>;
      };

      for (const item of data.data ?? []) {
        const tokens =
          (item.n_context_tokens_total ?? 0) + (item.n_generated_tokens_total ?? 0);
        events.push({
          vendor: 'openai',
          service: item.snapshot_id ?? 'unknown',
          timestamp: item.aggregation_timestamp
            ? new Date(item.aggregation_timestamp * 1000)
            : new Date(current),
          cost_usd: (item.total_usage ?? 0) / 100, // cents → dollars
          usage_quantity: tokens || undefined,
          usage_unit: tokens ? 'tokens' : undefined,
          metadata: { snapshot_id: item.snapshot_id },
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return events;
  }

  // ---------------------------------------------------------------------------
  // Mock implementation (no credentials needed)
  // ---------------------------------------------------------------------------

  private mockCosts(start: Date, end: Date): NormalizedCostEvent[] {
    const models = [
      { name: 'gpt-4o', ratePerMToken: 5.0, avgTokens: 3_000 },
      { name: 'gpt-4o-mini', ratePerMToken: 0.15, avgTokens: 6_000 },
      { name: 'text-embedding-3-small', ratePerMToken: 0.02, avgTokens: 10_000 },
      { name: 'whisper-1', ratePerMToken: 0.006, avgTokens: 50_000 },
    ];

    const events: NormalizedCostEvent[] = [];
    const current = new Date(start);

    while (current <= end) {
      for (const model of models) {
        const calls = Math.floor(rand(10, 150));
        const tokens = calls * model.avgTokens + Math.floor(rand(0, model.avgTokens));
        events.push({
          vendor: 'openai',
          service: model.name,
          timestamp: new Date(current.getTime() + rand(0, 86_400_000)),
          cost_usd: parseFloat(((tokens / 1_000_000) * model.ratePerMToken).toFixed(6)),
          usage_quantity: tokens,
          usage_unit: 'tokens',
          project_id: 'production',
          metadata: { calls, model: model.name, environment: 'production' },
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return events;
  }
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
