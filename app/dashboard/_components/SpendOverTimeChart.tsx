'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface Props {
  data: Array<{ day: string; total: number }>;
}

function shortDate(iso: string) {
  const [, month, day] = iso.split('-');
  return `${parseInt(month)}/${parseInt(day)}`;
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SpendOverTimeChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="card p-6 flex items-center justify-center h-64 text-tabler-muted text-sm">
        No data available
      </div>
    );
  }

  const display = data.map((d) => ({ ...d, day: shortDate(d.day) }));

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-tabler-text mb-4">Spend Over Time (7d)</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={display} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#206bc4" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#206bc4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: '#6c757d' }}
            tickLine={false}
            axisLine={false}
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
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#206bc4"
            strokeWidth={2}
            fill="url(#spendGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
