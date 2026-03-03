import { NextResponse } from 'next/server';
import { adapters } from '@/lib/cost/adapters/registry';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/costs/sync
 *
 * Calls all registered adapters, fetches costs for the last 24 hours,
 * and upserts them into cost_events. Returns a summary of what was inserted.
 *
 * Intentionally simple — no queues, no background workers.
 * Call this from a cron job or manually as needed.
 */
export async function POST() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  try {
    const results = await Promise.allSettled(
      adapters.map((adapter) =>
        adapter.fetchCosts(start, end).then((events) => ({ name: adapter.name, events })),
      ),
    );

    const adapterSummaries: Array<{ name: string; fetched: number; error?: string }> = [];
    const allEvents: Array<{
      vendor: string;
      service: string;
      timestamp: Date;
      cost_usd: number;
      usage_quantity: number | null;
      usage_unit: string | null;
      project_id: string | null;
      metadata: object;
    }> = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, events } = result.value;
        adapterSummaries.push({ name, fetched: events.length });
        allEvents.push(
          ...events.map((e) => ({
            vendor: e.vendor,
            service: e.service,
            timestamp: e.timestamp,
            cost_usd: e.cost_usd,
            usage_quantity: e.usage_quantity ?? null,
            usage_unit: e.usage_unit ?? null,
            project_id: e.project_id ?? null,
            metadata: (e.metadata ?? {}) as object,
          })),
        );
      } else {
        const err = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[sync] Adapter failed:`, err);
        adapterSummaries.push({ name: 'unknown', fetched: 0, error: err });
      }
    }

    const inserted = await prisma.costEvent.createMany({
      data: allEvents,
      skipDuplicates: false,
    });

    return NextResponse.json({
      ok: true,
      inserted: inserted.count,
      range: { start: start.toISOString(), end: end.toISOString() },
      adapters: adapterSummaries,
    });
  } catch (error) {
    console.error('[sync] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
