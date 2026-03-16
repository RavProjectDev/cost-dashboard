import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface QueryFilter {
  start: Date;
  end: Date;
  vendor?: string;
}

function where(f: QueryFilter) {
  return {
    timestamp: { gte: f.start, lte: f.end },
    ...(f.vendor ? { vendor: f.vendor } : {}),
  };
}

export async function getTotalSpend(f: QueryFilter): Promise<number> {
  const result = await prisma.costEvent.aggregate({
    where: where(f),
    _sum: { cost_usd: true },
  });
  return result._sum.cost_usd ? parseFloat(result._sum.cost_usd.toString()) : 0;
}

export async function getSpendByVendor(
  f: QueryFilter,
): Promise<Array<{ vendor: string; total: number }>> {
  const rows = await prisma.costEvent.groupBy({
    by: ['vendor'],
    where: where(f),
    _sum: { cost_usd: true },
    orderBy: { _sum: { cost_usd: 'desc' } },
  });
  return rows.map((r) => ({
    vendor: r.vendor,
    total: r._sum.cost_usd ? parseFloat(r._sum.cost_usd.toString()) : 0,
  }));
}

export async function getSpendOverTime(
  f: QueryFilter,
): Promise<Array<{ day: string; total: number }>> {
  const vendorClause = f.vendor
    ? Prisma.sql`AND vendor = ${f.vendor}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<Array<{ day: string; total: unknown }>>`
    SELECT DATE(timestamp)::text AS day, SUM(cost_usd) AS total
    FROM cost_events
    WHERE timestamp >= ${f.start}
      AND timestamp <= ${f.end}
      ${vendorClause}
    GROUP BY DATE(timestamp)
    ORDER BY day ASC
  `;

  const dataMap = new Map(rows.map((r) => [r.day, parseFloat(String(r.total))]));

  // Fill every calendar day in the range with 0 if no events
  const result: Array<{ day: string; total: number }> = [];
  const cur = new Date(f.start);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(f.end);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    const key = cur.toISOString().split('T')[0];
    result.push({ day: key, total: dataMap.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export async function getEventCount(f: QueryFilter): Promise<number> {
  return prisma.costEvent.count({ where: where(f) });
}

export async function getTopVendor(
  f: QueryFilter,
): Promise<{ vendor: string; total: number } | null> {
  const vendors = await getSpendByVendor(f);
  return vendors[0] ?? null;
}

export async function getRecentEvents(f: QueryFilter, limit = 200) {
  const events = await prisma.costEvent.findMany({
    where: where(f),
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  return events.map((e) => ({
    id: e.id,
    vendor: e.vendor,
    service: e.service,
    timestamp: e.timestamp,
    cost_usd: parseFloat(e.cost_usd.toString()),
    usage_quantity: e.usage_quantity,
    usage_unit: e.usage_unit,
    project_id: e.project_id,
    metadata: e.metadata,
  }));
}

export async function getVendors(): Promise<string[]> {
  const rows = await prisma.costEvent.findMany({
    select: { vendor: true },
    distinct: ['vendor'],
    orderBy: { vendor: 'asc' },
  });
  return rows.map((r) => r.vendor);
}
