import {
  IconCurrencyDollar,
  IconTrendingUp,
  IconCloudComputing,
  IconActivity,
} from '@tabler/icons-react';

interface Props {
  totalSpend: number;
  avgDailySpend: number;
  topVendor: { vendor: string; total: number } | null;
  eventCount: number;
  periodLabel: string;
  days: number;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${accent}`}>
        <Icon size={22} stroke={1.5} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-tabler-muted font-medium truncate">{title}</p>
        <p className="mt-0.5 text-2xl font-semibold text-tabler-text tracking-tight">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-tabler-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StatsCards({ totalSpend, avgDailySpend, topVendor, eventCount, periodLabel, days }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title={`Total Spend (${periodLabel})`}
        value={formatUsd(totalSpend)}
        subtitle={`Last ${days} days across all vendors`}
        icon={IconCurrencyDollar}
        accent="bg-blue-600"
      />
      <StatCard
        title="Daily Average"
        value={formatUsd(avgDailySpend)}
        subtitle="Average cost per day"
        icon={IconTrendingUp}
        accent="bg-violet-600"
      />
      <StatCard
        title="Top Vendor"
        value={topVendor ? topVendor.vendor.toUpperCase() : '—'}
        subtitle={topVendor ? `${formatUsd(topVendor.total)} this period` : 'No data'}
        icon={IconCloudComputing}
        accent="bg-emerald-600"
      />
      <StatCard
        title="Cost Events"
        value={eventCount.toLocaleString()}
        subtitle={`Events recorded (${periodLabel})`}
        icon={IconActivity}
        accent="bg-orange-500"
      />
    </div>
  );
}
