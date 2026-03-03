import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  console.log('🌱 Seeding cost_events...');

  await prisma.costEvent.deleteMany();

  type EventInput = {
    vendor: string;
    service: string;
    timestamp: Date;
    cost_usd: number;
    usage_quantity?: number;
    usage_unit?: string;
    project_id?: string;
    metadata: object;
  };

  const events: EventInput[] = [];

  const openaiServices = [
    { model: 'gpt-4o', ratePerMToken: 5.0, avgTokens: 3_000 },
    { model: 'gpt-4o-mini', ratePerMToken: 0.15, avgTokens: 6_000 },
    { model: 'text-embedding-3-small', ratePerMToken: 0.02, avgTokens: 10_000 },
    { model: 'whisper-1', ratePerMToken: 0.006, avgTokens: 50_000 },
  ];

  const gcpServices = [
    { service: 'Cloud Run', unit: 'vCPU-seconds', rate: 0.000024, minQty: 50_000, maxQty: 500_000 },
    { service: 'Cloud SQL', unit: 'GB-hours', rate: 0.19, minQty: 20, maxQty: 200 },
    { service: 'Cloud Storage', unit: 'GB', rate: 0.02, minQty: 100, maxQty: 2_000 },
    { service: 'BigQuery', unit: 'TB-processed', rate: 5.0, minQty: 0.1, maxQty: 5 },
  ];

  for (let daysBack = 6; daysBack >= 0; daysBack--) {
    const baseDate = daysAgo(daysBack);
    const jitter = () => randomBetween(0, 86_400_000); // spread events across the day

    // OpenAI events
    for (const { model, ratePerMToken, avgTokens } of openaiServices) {
      const calls = Math.floor(randomBetween(10, 150));
      const tokens = calls * avgTokens + Math.floor(randomBetween(0, avgTokens));
      const cost = parseFloat(((tokens / 1_000_000) * ratePerMToken).toFixed(6));

      events.push({
        vendor: 'openai',
        service: model,
        timestamp: new Date(baseDate.getTime() + jitter()),
        cost_usd: cost,
        usage_quantity: tokens,
        usage_unit: 'tokens',
        project_id: 'production',
        metadata: { calls, model, environment: 'production' },
      });
    }

    // GCP events
    for (const { service, unit, rate, minQty, maxQty } of gcpServices) {
      const qty = parseFloat(randomBetween(minQty, maxQty).toFixed(4));
      const cost = parseFloat((qty * rate * randomBetween(0.9, 1.1)).toFixed(6));

      events.push({
        vendor: 'gcp',
        service,
        timestamp: new Date(baseDate.getTime() + jitter()),
        cost_usd: cost,
        usage_quantity: qty,
        usage_unit: unit,
        project_id: 'my-gcp-project',
        metadata: { region: 'us-central1', billing_account: 'billingAccounts/mock-001' },
      });
    }
  }

  await prisma.costEvent.createMany({ data: events });

  const total = events.reduce((sum, e) => sum + e.cost_usd, 0);
  console.log(`✅ Seeded ${events.length} events — total cost: $${total.toFixed(2)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
