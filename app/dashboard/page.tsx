import { IconChartBar } from '@tabler/icons-react';
import {
  getTotalSpend,
  getSpendByVendor,
  getSpendOverTime,
  getEventCount,
  getTopVendor,
  getRecentEvents,
  getVendors,
  type QueryFilter,
} from '@/lib/cost/queries';
import { StatsCards } from './_components/StatsCards';
import { SpendByVendorChart } from './_components/SpendByVendorChart';
import { SpendOverTimeChart } from './_components/SpendOverTimeChart';
import { RecentEventsTable } from './_components/RecentEventsTable';
import { SyncButton } from './_components/SyncButton';
import { FilterBar } from './_components/FilterBar';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

const PRESET_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 180,
  '1y': 365,
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preset = (params.preset as string) ?? '30d';
  const vendorParam = (params.vendor as string) || undefined;

  const days = PRESET_DAYS[preset] ?? 30;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const filter: QueryFilter = { start, end, vendor: vendorParam };

  const [totalSpend, spendByVendor, spendOverTime, eventCount, topVendor, recentEvents, vendors] =
    await Promise.all([
      getTotalSpend(filter),
      getSpendByVendor(filter),
      getSpendOverTime(filter),
      getEventCount(filter),
      getTopVendor(filter),
      getRecentEvents(filter, 200),
      getVendors(),
    ]);

  const avgDailySpend = totalSpend / days;

  return (
    <div className="min-h-screen bg-tabler-bg">
      {/* Header */}
      <header className="bg-white border-b border-tabler-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-tabler-primary rounded-lg flex items-center justify-center">
              <IconChartBar size={18} stroke={2} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-tabler-text leading-tight">
                Cost Dashboard
              </h1>
              <p className="text-xs text-tabler-muted">
                {vendorParam ? vendorParam.toUpperCase() : 'All vendors'} · Last {days} days
              </p>
            </div>
          </div>
          <SyncButton />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filter bar */}
        <Suspense>
          <FilterBar vendors={vendors} />
        </Suspense>

        {/* KPI row */}
        <StatsCards
          totalSpend={totalSpend}
          avgDailySpend={avgDailySpend}
          topVendor={topVendor}
          eventCount={eventCount}
          periodLabel={preset}
          days={days}
        />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendByVendorChart data={spendByVendor} />
          <SpendOverTimeChart data={spendOverTime} periodLabel={preset} />
        </div>

        {/* Events table */}
        <RecentEventsTable events={recentEvents} />
      </main>
    </div>
  );
}
