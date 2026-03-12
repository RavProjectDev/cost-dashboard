const VENDOR_COLORS: Record<string, { bg: string; text: string }> = {
  openai: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  gcp: { bg: 'bg-blue-50', text: 'text-blue-700' },
  aws: { bg: 'bg-orange-50', text: 'text-orange-700' },
  azure: { bg: 'bg-sky-50', text: 'text-sky-700' },
};

function vendorBadge(vendor: string) {
  return VENDOR_COLORS[vendor.toLowerCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function formatUsd(amount: number) {
  // Show enough decimal places to always display at least 2 significant figures
  if (amount === 0) return '$0.00';
  if (amount < 0.0001) {
    return `$${amount.toExponential(2)}`;
  }
  if (amount < 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

function formatUsage(qty: number | null, unit: string | null) {
  if (qty === null) return '—';
  const formatted =
    qty >= 1_000_000
      ? `${(qty / 1_000_000).toFixed(2)}M`
      : qty >= 1_000
        ? `${(qty / 1_000).toFixed(1)}k`
        : qty.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

interface Event {
  id: string;
  vendor: string;
  service: string;
  timestamp: Date;
  cost_usd: number;
  usage_quantity: number | null;
  usage_unit: string | null;
  project_id: string | null;
}

interface Props {
  events: Event[];
}

export function RecentEventsTable({ events }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-tabler-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tabler-text">Recent Cost Events</h2>
        <span className="text-xs text-tabler-muted">{events.length} events</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 text-xs font-medium text-tabler-muted uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-xs font-medium text-tabler-muted uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-xs font-medium text-tabler-muted uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-xs font-medium text-tabler-muted uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-xs font-medium text-tabler-muted uppercase tracking-wider text-right">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tabler-border">
            {events.map((event) => {
              const badge = vendorBadge(event.vendor);
              return (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-tabler-muted whitespace-nowrap font-mono text-xs">
                    {formatTimestamp(event.timestamp)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`badge ${badge.bg} ${badge.text} font-medium uppercase tracking-wide`}
                    >
                      {event.vendor}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-tabler-text font-medium">{event.service}</td>
                  <td className="px-6 py-3 text-tabler-muted whitespace-nowrap">
                    {formatUsage(event.usage_quantity, event.usage_unit)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-tabler-text tabular-nums">
                    {formatUsd(event.cost_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="px-6 py-12 text-center text-tabler-muted text-sm">
            No events found. Run{' '}
            <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">npm run db:seed</code>{' '}
            to populate mock data.
          </div>
        )}
      </div>
    </div>
  );
}
