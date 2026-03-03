import { prisma } from '@/lib/prisma';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTotalSpend(days = 7): Promise<number> {
  const result = await prisma.costEvent.aggregate({
    where: { timestamp: { gte: daysAgo(days) } },
    _sum: { cost_usd: true },
  });
  return result._sum.cost_usd ? parseFloat(result._sum.cost_usd.toString()) : 0;
}

export async function getSpendByVendor(
  days = 7,
): Promise<Array<{ vendor: string; total: number }>> {
  const rows = await prisma.costEvent.groupBy({
    by: ['vendor'],
    where: { timestamp: { gte: daysAgo(days) } },
    _sum: { cost_usd: true },
    orderBy: { _sum: { cost_usd: 'desc' } },
  });
  return rows.map((r) => ({
    vendor: r.vendor,
    total: r._sum.cost_usd ? parseFloat(r._sum.cost_usd.toString()) : 0,
  }));
}

export async function getSpendOverTime(
  days = 7,
): Promise<Array<{ day: string; total: number }>> {
  const since = daysAgo(days);

  // Raw query for DATE-level grouping across potentially large datasets
  const rows = await prisma.$queryRaw<Array<{ day: string; total: unknown }>>`
    SELECT DATE(timestamp)::text AS day, SUM(cost_usd) AS total
    FROM cost_events
    WHERE timestamp >= ${since}
    GROUP BY DATE(timestamp)
    ORDER BY day ASC
  `;

  const dataMap = new Map(rows.map((r) => [r.day, parseFloat(String(r.total))]));

  // Ensure every day in the range appears, even if it had no events
  const result: Array<{ day: string; total: number }> = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({ day: key, total: dataMap.get(key) ?? 0 });
  }
  return result;
}

export async function getEventCount(days = 7): Promise<number> {
  return prisma.costEvent.count({
    where: { timestamp: { gte: daysAgo(days) } },
  });
}

export async function getTopVendor(
  days = 7,
): Promise<{ vendor: string; total: number } | null> {
  const vendors = await getSpendByVendor(days);
  return vendors[0] ?? null;
}

export async function getRecentEvents(limit = 50) {
  const events = await prisma.costEvent.findMany({
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
