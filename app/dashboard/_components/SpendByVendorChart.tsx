'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Props {
  data: Array<{ vendor: string; total: number }>;
}

const VENDOR_COLORS: Record<string, string> = {
  openai: '#10a37f',
  gcp: '#4285f4',
  aws: '#ff9900',
  azure: '#0089d6',
};

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#14b8a6', '#8b5cf6'];

function getVendorColor(vendor: string, index: number): string {
  return VENDOR_COLORS[vendor.toLowerCase()] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SpendByVendorChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="card p-6 flex items-center justify-center h-64 text-tabler-muted text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-tabler-text mb-4">Spend by Vendor (7d)</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" vertical={false} />
          <XAxis
            dataKey="vendor"
            tick={{ fontSize: 12, fill: '#6c757d' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.toUpperCase()}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6c757d' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
          />
          <Tooltip
            formatter={(value: number) => [formatUsd(value), 'Total Spend']}
            contentStyle={{
              border: '1px solid #e6e7e9',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={72}>
            {data.map((entry, index) => (
              <Cell key={entry.vendor} fill={getVendorColor(entry.vendor, index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
