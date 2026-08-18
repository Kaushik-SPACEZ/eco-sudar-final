import { apiFetch } from "./client";

// One row per invoice with its e-way bill status (LEFT JOIN eway_bills). The
// e-way bill is created/edited via the invoice endpoints; this list is read-only.
export interface EwayListRow {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  invoice_status: string;                       // invoices.status (Draft/Sent/Paid/…/Cancelled)
  total: number;
  eway_id: number | null;                       // non-null → transport details already saved
  ewb_no: string | null;
  ewb_date: string | null;
  valid_until: string | null;
  distance_km: number | null;
  status: "pending" | "generated" | "expired";  // computed server-side
}

export interface EwaySummary {
  total: number;
  generated: number;
  pending: number;
  expired: number;
}

function qs(p?: Record<string, string>) {
  if (!p || !Object.keys(p).length) return "";
  return "?" + new URLSearchParams(p).toString();
}

export const ewayApi = {
  list: (p?: Record<string, string>) =>
    apiFetch<{ success: boolean; data: { rows: EwayListRow[]; summary: EwaySummary } }>(
      `/admin/eway-bills${qs(p)}`,
    ),
};
