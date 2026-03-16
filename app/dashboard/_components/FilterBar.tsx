'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import clsx from 'clsx';

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
];

const VENDOR_COLORS: Record<string, string> = {
  openai: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  gcp: 'text-blue-700 bg-blue-50 border-blue-200',
  aws: 'text-orange-700 bg-orange-50 border-orange-200',
  azure: 'text-sky-700 bg-sky-50 border-sky-200',
};

interface Props {
  vendors: string[];
}

export function FilterBar({ vendors }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPreset = searchParams.get('preset') ?? '30d';
  const currentVendor = searchParams.get('vendor') ?? '';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Time range presets */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setParam('preset', p.label)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              currentPreset === p.label
                ? 'bg-white text-tabler-text shadow-sm border border-tabler-border'
                : 'text-tabler-muted hover:text-tabler-text',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Vendor filter */}
      {vendors.length > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setParam('vendor', '')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              currentVendor === ''
                ? 'bg-tabler-primary text-white border-tabler-primary'
                : 'bg-white text-tabler-muted border-tabler-border hover:text-tabler-text',
            )}
          >
            All vendors
          </button>
          {vendors.map((v) => {
            const colorClass =
              VENDOR_COLORS[v.toLowerCase()] ??
              'text-gray-700 bg-gray-50 border-gray-200';
            return (
              <button
                key={v}
                onClick={() => setParam('vendor', v)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all uppercase tracking-wide',
                  currentVendor === v
                    ? colorClass
                    : 'bg-white text-tabler-muted border-tabler-border hover:text-tabler-text',
                )}
              >
                {v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
