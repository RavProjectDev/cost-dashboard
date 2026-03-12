import type { CostAdapter, NormalizedCostEvent } from '../types';

/**
 * OpenAI cost adapter.
 *
 * Uses the Organization Costs API:
 *   GET https://api.openai.com/v1/organization/costs
 *
 * Key requirements:
 *   - An Admin API key (created at platform.openai.com/api-keys under
 *     Organization → Admin keys), NOT a project key (sk-proj-...).
 *   - The key needs the "organization.costs.read" permission.
 *
 * Falls back to the legacy /v1/usage endpoint if the costs API returns 403,
 * which can happen with older org keys that lack the new permission.
 */
export class OpenAIAdapter implements CostAdapter {
  readonly name = 'openai';
  private readonly apiKey: string;

  constructor(apiKey = process.env.OPENAI_API_KEY ?? '') {
    this.apiKey = apiKey;
  }

  async fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    if (!this.apiKey) {
      console.warn('[OpenAIAdapter] OPENAI_API_KEY is not set — skipping.');
      return [];
    }

    // Try the newer costs API first (requires Admin key)
    try {
      const events = await this.fetchViaCostsApi(start, end);
      if (events.length > 0) return events;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status !== 403 && status !== 401) throw err;
      console.warn('[OpenAIAdapter] Costs API returned', status, '— falling back to /v1/usage');
    }

    // Fallback: legacy usage API (org-level keys only)
    return this.fetchViaUsageApi(start, end);
  }

  // ---------------------------------------------------------------------------
  // Costs API — returns actual USD amounts, requires Admin API key
  // GET /v1/organization/costs
  // ---------------------------------------------------------------------------

  private async fetchViaCostsApi(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    type CostResult = {
      amount?: { value?: number; currency?: string };
      line_item?: string;
      project_id?: string;
    };
    type CostBucket = {
      start_time?: number;
      results?: CostResult[];
    };
    type CostsPage = {
      data?: CostBucket[];
      has_more?: boolean;
      next_page?: string | null;
    };

    const events: NormalizedCostEvent[] = [];
    let page: string | null = null;

    // Paginate until all results are fetched
    do {
      const params = new URLSearchParams({
        start_time: Math.floor(start.getTime() / 1000).toString(),
        end_time: Math.floor(end.getTime() / 1000).toString(),
        bucket_width: '1d',
        limit: '100',
        'group_by[0]': 'line_item',
      });
      if (page) params.set('page', page);

      const res = await fetch(`https://api.openai.com/v1/organization/costs?${params}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        const err = new Error(
          `OpenAI Costs API error ${res.status}: ${await res.text()}`,
        ) as Error & { status: number };
        err.status = res.status;
        throw err;
      }

      const data = (await res.json()) as CostsPage;

      for (const bucket of data.data ?? []) {
        const ts = bucket.start_time ? new Date(bucket.start_time * 1000) : start;
        for (const result of bucket.results ?? []) {
          // Skip aggregate rows (null line_item) — they duplicate the grouped rows
          if (!result.line_item) continue;
          const cost = result.amount?.value ?? 0;
          if (cost <= 0) continue;
          events.push({
            vendor: 'openai',
            service: result.line_item,
            timestamp: ts,
            cost_usd: cost,
            project_id: result.project_id ?? undefined,
            metadata: {
              source: 'organization_costs_api',
              currency: result.amount?.currency ?? 'usd',
            },
          });
        }
      }

      page = data.has_more ? (data.next_page ?? null) : null;
    } while (page !== null);

    return events;
  }

  // ---------------------------------------------------------------------------
  // Legacy usage API — token counts only, org-level keys only
  // GET /v1/usage?date=YYYY-MM-DD
  // ---------------------------------------------------------------------------

  private async fetchViaUsageApi(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    const events: NormalizedCostEvent[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const res = await fetch(`https://api.openai.com/v1/usage?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error(`OpenAI Usage API error ${res.status}: ${await res.text()}`);
      }

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
        const cost = (item.total_usage ?? 0) / 100;
        if (cost <= 0) continue;
        const tokens =
          (item.n_context_tokens_total ?? 0) + (item.n_generated_tokens_total ?? 0);
        events.push({
          vendor: 'openai',
          service: item.snapshot_id ?? 'unknown',
          timestamp: item.aggregation_timestamp
            ? new Date(item.aggregation_timestamp * 1000)
            : new Date(current),
          cost_usd: cost,
          usage_quantity: tokens || undefined,
          usage_unit: tokens ? 'tokens' : undefined,
          metadata: { source: 'usage_api', snapshot_id: item.snapshot_id },
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return events;
  }
}
