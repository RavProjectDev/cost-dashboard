import { IconChartBar } from '@tabler/icons-react';
import {
  getTotalSpend,
  getSpendByVendor,
  getSpendOverTime,
  getEventCount,
  getTopVendor,
  getRecentEvents,
} from '@/lib/cost/queries';
import { StatsCards } from './_components/StatsCards';
import { SpendByVendorChart } from './_components/SpendByVendorChart';
import { SpendOverTimeChart } from './_components/SpendOverTimeChart';
import { RecentEventsTable } from './_components/RecentEventsTable';
import { SyncButton } from './_components/SyncButton';

export const dynamic = 'force-dynamic';

const DAYS = 7;

export default async function DashboardPage() {
  const [totalSpend, spendByVendor, spendOverTime, eventCount, topVendor, recentEvents] =
    await Promise.all([
      getTotalSpend(DAYS),
      getSpendByVendor(DAYS),
      getSpendOverTime(DAYS),
      getEventCount(DAYS),
      getTopVendor(DAYS),
      getRecentEvents(50),
    ]);

  const avgDailySpend = totalSpend / DAYS;

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
              <p className="text-xs text-tabler-muted">Last {DAYS} days</p>
            </div>
          </div>
          <SyncButton />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* KPI row */}
        <StatsCards
          totalSpend={totalSpend}
          avgDailySpend={avgDailySpend}
          topVendor={topVendor}
          eventCount={eventCount}
        />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendByVendorChart data={spendByVendor} />
          <SpendOverTimeChart data={spendOverTime} />
        </div>

        {/* Events table */}
        <RecentEventsTable events={recentEvents} />
      </main>
    </div>
  );
}
