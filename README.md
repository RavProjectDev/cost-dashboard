# Cost Dashboard

A minimal, production-ready Next.js 14 dashboard for monitoring AI and cloud spend across vendors.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Prisma** + **PostgreSQL**
- **Tailwind CSS** + Tabler design language
- **Recharts** for charts

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cost_dashboard"
```

### 3. Create the database

```bash
createdb cost_dashboard   # or use your preferred tool
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

### 5. Seed mock data

```bash
npm run db:seed
```

This inserts 7 days of realistic mock data for OpenAI and GCP.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard.

---

## Sync endpoint

Pull fresh costs from all adapters (last 24h):

```bash
curl -X POST http://localhost:3000/api/costs/sync
```

Response:
```json
{
  "ok": true,
  "inserted": 8,
  "range": { "start": "...", "end": "..." },
  "adapters": [
    { "name": "openai", "fetched": 4 },
    { "name": "gcp", "fetched": 4 }
  ]
}
```

You can wire this to a cron job or call it manually.

---

## Adding a new vendor

1. Create `/lib/cost/adapters/my-vendor.ts` implementing the `CostAdapter` interface:

```ts
import type { CostAdapter, NormalizedCostEvent } from '../types';

export class MyVendorAdapter implements CostAdapter {
  readonly name = 'my-vendor';

  async fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    // call vendor API, map to NormalizedCostEvent
  }
}
```

2. Register it in `/lib/cost/adapters/registry.ts`:

```ts
import { MyVendorAdapter } from './my-vendor';

export const adapters: CostAdapter[] = [
  new OpenAIAdapter(),
  new GCPBillingAdapter(),
  new MyVendorAdapter(), // ← add here
];
```

That's it. The dashboard and sync endpoint pick it up automatically.

---

## Project structure

```
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                   # Server component — reads only from cost_events
│   │   └── _components/
│   │       ├── StatsCards.tsx
│   │       ├── SpendByVendorChart.tsx  # Client component (Recharts)
│   │       ├── SpendOverTimeChart.tsx  # Client component (Recharts)
│   │       ├── RecentEventsTable.tsx
│   │       └── SyncButton.tsx         # Client component
│   └── api/costs/sync/route.ts        # POST — calls all adapters, upserts events
├── lib/
│   ├── prisma.ts                      # Singleton Prisma client
│   └── cost/
│       ├── types.ts                   # CostAdapter interface + NormalizedCostEvent
│       ├── queries.ts                 # All DB reads (vendor-agnostic)
│       └── adapters/
│           ├── openai.ts
│           ├── gcp.ts
│           └── registry.ts
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | No | `""` | If empty, adapter uses mock data |
| `GCP_PROJECT_ID` | No | `"mock-project"` | GCP project (adapter is stubbed) |
