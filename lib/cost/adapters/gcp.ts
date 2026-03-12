import type { CostAdapter, NormalizedCostEvent } from '../types';

/**
 * GCP Billing adapter.
 *
 * Reads from the Standard Usage Cost BigQuery export.
 * Table: ravlegacyproject.cost_table.gcp_billing_export_v1_010348_587C19_53C62D
 *
 * Authentication (pick one):
 *   1. Application Default Credentials (local dev):
 *        gcloud auth application-default login
 *   2. Service account key (CI / production):
 *        GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
 *
 * Returns an empty array (not mock data) if BigQuery is unreachable or the
 * export table has no rows yet (first export takes 24-48h after enabling).
 */
export class GCPBillingAdapter implements CostAdapter {
  readonly name = 'gcp';

  private readonly projectId: string;
  private readonly table: string;

  constructor(
    projectId = process.env.GCP_PROJECT_ID ?? 'ravlegacyproject',
    table = process.env.GCP_BILLING_TABLE ??
      'ravlegacyproject.cost_table.gcp_billing_export_v1_010348_587C19_53C62D',
  ) {
    this.projectId = projectId;
    this.table = table;
  }

  async fetchCosts(start: Date, end: Date): Promise<NormalizedCostEvent[]> {
    const { BigQuery } = await import('@google-cloud/bigquery');

    const credentials = process.env.GCP_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      : undefined;

    const bq = new BigQuery({
      projectId: this.projectId,
      ...(credentials ? { credentials } : {}),
    });

    // One row per service per day — keeps the event count manageable.
    // The billing export uses usage_start_time (TIMESTAMP) for the date dimension.
    const query = `
      SELECT
        service.description                    AS service_name,
        DATE(usage_start_time)                 AS usage_date,
        SUM(cost)                              AS total_cost,
        SUM(usage.amount)                      AS total_usage,
        ANY_VALUE(usage.unit)                  AS usage_unit,
        ANY_VALUE(project.id)                  AS project_id
      FROM \`${this.table}\`
      WHERE
        DATE(usage_start_time) >= @start
        AND DATE(usage_start_time) <= @end
        AND cost > 0
      GROUP BY
        service.description,
        DATE(usage_start_time)
      ORDER BY
        usage_date DESC,
        total_cost DESC
    `;

    // Use DATE-level params — billing records are timestamped at the start of the
    // day (00:00 UTC), so exact-timestamp filtering misses records from earlier
    // in the same day.
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    const [rows] = await bq.query({
      query,
      params: { start: startDate, end: endDate },
      useLegacySql: false,
    });

    if (!rows.length) {
      console.info(
        '[GCPBillingAdapter] No rows returned — ' +
          'export may still be pending (first export takes 24-48h after enabling).',
      );
      return [];
    }

    return rows.map(
      (row: {
        service_name: string;
        usage_date: { value: string } | string;
        total_cost: number;
        total_usage: number | null;
        usage_unit: string | null;
        project_id: string | null;
      }) => ({
        vendor: 'gcp',
        service: row.service_name,
        // BigQuery DATE comes back as { value: 'YYYY-MM-DD' } or a plain string
        timestamp: new Date(
          typeof row.usage_date === 'object' ? row.usage_date.value : row.usage_date,
        ),
        cost_usd: row.total_cost,
        usage_quantity: row.total_usage ?? undefined,
        usage_unit: row.usage_unit ?? undefined,
        project_id: row.project_id ?? this.projectId,
        metadata: { source: 'bigquery_billing_export', table: this.table },
      }),
    );
  }
}
