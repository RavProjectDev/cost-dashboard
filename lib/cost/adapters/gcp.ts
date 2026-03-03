import type { CostAdapter, NormalizedCostEvent } from '../types';

/**
 * GCP Billing adapter — currently stubbed with mock data.
 *
 * To wire up the real API, replace mockCosts() with a call to:
 *   Google Cloud Billing Budget API  — list cost data from BigQuery export
 *   or Cloud Billing API             — https://cloud.google.com/billing/docs/reference/rest
 *
 * Authentication would use Application Default Credentials (ADC):
 *   import { GoogleAuth } from 'google-auth-library';
 */
export class GCPBillingAdapter implements CostAdapter {
  readonly name = 'gcp';
  private readonly projectId: string;

  constructor(projectId = process.env.GCP_PROJECT_ID ?? 'mock-project') {
    this.projectId = projectId;
  }

  async fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    // TODO: replace with real GCP Billing API call when credentials are available
    return this.mockCosts(start, end);
  }

  private mockCosts(start: Date, end: Date): NormalizedCostEvent[] {
    const services = [
      { service: 'Cloud Run', unit: 'vCPU-seconds', rate: 0.000024, min: 50_000, max: 500_000 },
      { service: 'Cloud SQL', unit: 'GB-hours', rate: 0.19, min: 20, max: 200 },
      { service: 'Cloud Storage', unit: 'GB', rate: 0.02, min: 100, max: 2_000 },
      { service: 'BigQuery', unit: 'TB-processed', rate: 5.0, min: 0.1, max: 5 },
    ];

    const events: NormalizedCostEvent[] = [];
    const current = new Date(start);

    while (current <= end) {
      for (const svc of services) {
        const qty = parseFloat(rand(svc.min, svc.max).toFixed(4));
        events.push({
          vendor: 'gcp',
          service: svc.service,
          timestamp: new Date(current.getTime() + rand(0, 86_400_000)),
          cost_usd: parseFloat((qty * svc.rate * rand(0.9, 1.1)).toFixed(6)),
          usage_quantity: qty,
          usage_unit: svc.unit,
          project_id: this.projectId,
          metadata: {
            region: 'us-central1',
            billing_account: 'billingAccounts/mock-001',
          },
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return events;
  }
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
