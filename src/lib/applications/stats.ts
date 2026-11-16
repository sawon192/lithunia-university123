import type { StoredApplication, ApplicationStatus } from "./store";

export type DashboardStats = {
  total: number;
  newCount: number;
  underReview: number;
  documentsWaiting: number;
  eligible: number;
  submitted: number;
  offers: number;
  rejected: number;
  byStatus: Record<string, number>;
};

const DOC_REQUIRED: ApplicationStatus[] = ["Documents Required"];

export function summarise(rows: StoredApplication[]): DashboardStats {
  const byStatus: Record<string, number> = {};
  for (const row of rows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;

  return {
    total: rows.length,
    newCount: byStatus["New"] ?? 0,
    underReview: byStatus["Under Review"] ?? 0,
    documentsWaiting: DOC_REQUIRED.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0),
    eligible: byStatus["Eligible"] ?? 0,
    submitted:
      (byStatus["Application Submitted"] ?? 0) + (byStatus["Offer Received"] ?? 0) + (byStatus["Visa Processing"] ?? 0) +
      (byStatus["Visa Approved"] ?? 0) + (byStatus["Visa Refused"] ?? 0),
    offers: byStatus["Offer Received"] ?? 0,
    rejected: (byStatus["Not Eligible"] ?? 0) + (byStatus["Visa Refused"] ?? 0),
    byStatus,
  };
}

/** Records with no official source checked in the last 60 days. */
export function staleResearchDays(lastVerified: string | undefined, today = new Date()) {
  if (!lastVerified) return null;
  const parsed = new Date(lastVerified);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((today.getTime() - parsed.getTime()) / (24 * 3600 * 1000));
}
