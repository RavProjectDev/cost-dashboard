'use client';

import { useState } from 'react';
import { IconRefresh } from '@tabler/icons-react';
import clsx from 'clsx';

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSync() {
    setState('loading');
    setMessage('');
    try {
      const res = await fetch('/api/costs/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Inserted ${data.inserted} events`);
        setState('done');
      } else {
        setMessage(data.error ?? 'Sync failed');
        setState('error');
      }
    } catch {
      setMessage('Network error');
      setState('error');
    }
    setTimeout(() => setState('idle'), 4000);
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span
          className={clsx(
            'text-xs font-medium',
            state === 'done' ? 'text-emerald-600' : 'text-red-500',
          )}
        >
          {message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'border border-tabler-border bg-white text-tabler-text',
          'hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <IconRefresh
          size={15}
          stroke={1.5}
          className={clsx(state === 'loading' && 'animate-spin')}
        />
        {state === 'loading' ? 'Syncing…' : 'Sync Now'}
      </button>
    </div>
  );
}
