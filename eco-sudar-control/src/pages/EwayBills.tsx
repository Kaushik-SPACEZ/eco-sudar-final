import { useEffect, useMemo, useState } from "react";
import { Search, Truck, Download, Printer, FileText, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EwayBillDialog } from "@/components/EwayBillDialog";
import { apiFetch } from "@/lib/api/client";
import { loadCompanyProfile } from "@/lib/companyProfile";
import { ewayApi, type EwayListRow, type EwaySummary } from "@/lib/api/eway";
import { cn } from "@/lib/utils";
import {
  emptyEwayForm, downloadEwayJson, printEwaySlip,
  type EwayForm, type EwayInvoiceData,
} from "@/lib/ewayBill";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

// Status badge colours — matches the project status palette.
const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-status-pending/10 text-status-pending border-status-pending/20",
  generated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired:   "bg-red-50 text-red-600 border-red-200",
};

// ── Invoice detail → e-way builder input (same mapping as Invoices.tsx) ──────
interface InvoiceDetailItem {
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  gst_rate?: number;
}
interface InvoiceDetail {
  invoice_number: string;
  invoice_date?: string | null;
  created_at?: string | null;
  customer_name?: string | null;
  order_company_name?: string | null;
  customer_gstin?: string | null;
  customer_state?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_pincode?: string | null;
  customer_country?: string | null;
  subtotal?: number;
  discount?: number | null;
  gst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total?: number;
  items?: InvoiceDetailItem[];
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addressLines(...parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join("\n");
}

function detailToEway(d: InvoiceDetail): EwayInvoiceData {
  const items = (d.items ?? []).map((i) => {
    const product = i.description.split(" - ")[0] || i.description;
    return {
      product,
      hsn: i.hsn_code || "",
      qty: num(i.quantity),
      unit: i.unit || "Nos",
      unitPrice: num(i.unit_price),
      gstRate: num(i.gst_rate ?? d.gst_rate ?? 18),
    };
  });
  const subtotal = num(d.subtotal);
  const discount = num(d.discount);
  return {
    invoiceNumber: d.invoice_number,
    invoiceDate: (d.invoice_date || d.created_at || "").slice(0, 10),
    customer: d.customer_name ?? d.order_company_name ?? "—",
    customerGstin: d.customer_gstin ?? "",
    customerState: d.customer_state || "Tamil Nadu",
    customerAddress: addressLines(d.customer_address, d.customer_city, d.customer_pincode, d.customer_country),
    customerCity: "",
    interState: num(d.igst_amount) > 0,
    cgst: num(d.cgst_amount),
    sgst: num(d.sgst_amount),
    igst: num(d.igst_amount),
    taxable: Math.max(0, subtotal - discount),
    total: num(d.total),
    lines: items,
  };
}

// Build the saved e-way form from the stored row (mirrors EwayBillDialog).
function savedRowToForm(row: Record<string, unknown> | null, inv: EwayInvoiceData, base: EwayForm): EwayForm {
  if (!row) return { ...base, to_place: inv.customerCity };
  const s = (k: string) => (row[k] == null ? "" : String(row[k]));
  return {
    supply_type: s("supply_type") || "O", sub_supply: s("sub_supply") || "1", doc_type: s("doc_type") || "INV",
    trans_mode: s("trans_mode") || "1", vehicle_no: s("vehicle_no"), vehicle_type: s("vehicle_type") || "R",
    transporter_id: s("transporter_id"), transporter_name: s("transporter_name"),
    transport_doc_no: s("transport_doc_no"), transport_doc_date: s("transport_doc_date").slice(0, 10),
    distance_km: s("distance_km"),
    from_gstin: s("from_gstin") || base.from_gstin, from_name: s("from_name") || base.from_name,
    from_addr: s("from_addr") || base.from_addr, from_place: s("from_place"),
    from_pincode: s("from_pincode"), from_state: s("from_state") || "Tamil Nadu",
    to_place: s("to_place") || inv.customerCity, to_pincode: s("to_pincode"),
    ewb_no: s("ewb_no"), ewb_date: s("ewb_date").slice(0, 10), valid_until: s("valid_until").slice(0, 10),
    notes: s("notes"),
  };
}

// Fetch the full invoice + saved e-way row + company profile, ready for the JSON / slip helpers.
async function loadInvAndForm(invoiceId: number): Promise<{ inv: EwayInvoiceData; form: EwayForm }> {
  const [full, ewayRes, profile] = await Promise.all([
    apiFetch<{ data: InvoiceDetail }>(`/admin/invoices/${invoiceId}`),
    apiFetch<{ data: Record<string, unknown> | null }>(`/admin/invoices/${invoiceId}/eway-bill`),
    loadCompanyProfile(),
  ]);
  const inv = detailToEway(full.data);
  const base = emptyEwayForm();
  base.from_gstin = profile.gstin || "";
  base.from_name = profile.name || "";
  base.from_addr = profile.address || "";
  return { inv, form: savedRowToForm(ewayRes.data, inv, base) };
}

export default function EwayBills() {
  const [rows, setRows] = useState<EwayListRow[]>([]);
  const [summary, setSummary] = useState<EwaySummary>({ total: 0, generated: 0, pending: 0, expired: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "generated" | "expired">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Manage dialog (reuses the existing EwayBillDialog, driven by an invoice id + mapped data).
  const [ewayOpen, setEwayOpen] = useState(false);
  const [ewayInvoiceId, setEwayInvoiceId] = useState<number | null>(null);
  const [ewayInv, setEwayInv] = useState<EwayInvoiceData | null>(null);
  const [managingId, setManagingId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ewayApi.list();
      setRows(res.data?.rows ?? []);
      setSummary(res.data?.summary ?? { total: 0, generated: 0, pending: 0, expired: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load e-way bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (from && (r.invoice_date || "") < from) return false;
      if (to && (r.invoice_date || "") > to) return false;
      if (q && !(`${r.invoice_number}`.toLowerCase().includes(q) || (r.customer_name || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, status, from, to]);

  // Open the E-Way dialog for a row: fetch the invoice detail, map it, then open.
  const openManage = async (row: EwayListRow) => {
    setManagingId(row.invoice_id);
    try {
      const full = await apiFetch<{ data: InvoiceDetail }>(`/admin/invoices/${row.invoice_id}`);
      setEwayInv(detailToEway(full.data));
      setEwayInvoiceId(row.invoice_id);
      setEwayOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open e-way bill");
    } finally {
      setManagingId(null);
    }
  };

  // Reload once the dialog closes (the dialog blocks close while saving, so this
  // fires only after any save completes).
  const onEwayOpenChange = (v: boolean) => {
    setEwayOpen(v);
    if (!v) { setEwayInvoiceId(null); setEwayInv(null); load(); }
  };

  const doDownload = async (row: EwayListRow) => {
    setActionId(row.invoice_id);
    try {
      const { inv, form } = await loadInvAndForm(row.invoice_id);
      downloadEwayJson(inv, form);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build JSON");
    } finally {
      setActionId(null);
    }
  };

  const doPrint = async (row: EwayListRow) => {
    setActionId(row.invoice_id);
    try {
      const { inv, form } = await loadInvAndForm(row.invoice_id);
      printEwaySlip(inv, form);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to print slip");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Way Bills</h1>
          <p className="text-muted-foreground">Transport e-way bills across all GST invoices</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={String(summary.total)} subtitle="in the current invoice list" icon={FileText} subtitleColor="muted" />
        <StatCard title="EWB Generated" value={String(summary.generated)} subtitle="valid e-way bills" icon={CheckCircle2} accent="emerald" />
        <StatCard title="Pending" value={String(summary.pending)} subtitle="awaiting transport details" icon={Clock} accent="amber" />
        <StatCard title="Expiring / Expired" value={String(summary.expired)} subtitle="validity has lapsed" icon={AlertTriangle} accent="rose" />
      </div>

      {/* Table card */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-end gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice no. or customer…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" className="mt-1 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" className="mt-1 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>

        <ScrollableX>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice No</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice Value</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">EWB No</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valid Until</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                </tr>
              ))}

              {!loading && filtered.map((r) => (
                <tr
                  key={r.invoice_id}
                  onClick={() => openManage(r)}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  title="Click to manage the e-way bill"
                >
                  <td className="px-6 py-4 font-medium text-primary">{r.invoice_number}</td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{r.invoice_date || "—"}</td>
                  <td className="px-6 py-4 text-card-foreground">{r.customer_name || "—"}</td>
                  <td className="px-6 py-4 text-right font-semibold text-card-foreground whitespace-nowrap">{inr(r.total)}</td>
                  <td className="px-6 py-4 font-mono text-xs text-card-foreground">{r.ewb_no || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{r.valid_until || "—"}</td>
                  <td className="px-6 py-4">
                    <Badge className={cn("border capitalize", STATUS_STYLES[r.status] ?? "bg-muted text-muted-foreground")}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openManage(r)}
                        disabled={managingId === r.invoice_id}
                        className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-50"
                        title="Manage e-way bill"
                      >
                        {managingId === r.invoice_id
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          : <Truck className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {r.eway_id !== null && (
                        <>
                          <button
                            onClick={() => doDownload(r)}
                            disabled={actionId === r.invoice_id}
                            className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-50"
                            title="Download NIC JSON"
                          >
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => doPrint(r)}
                            disabled={actionId === r.invoice_id}
                            className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-50"
                            title="Print slip"
                          >
                            <Printer className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">No e-way bills found</td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollableX>
      </div>

      <EwayBillDialog
        open={ewayOpen}
        onOpenChange={onEwayOpenChange}
        invoiceId={ewayInvoiceId}
        inv={ewayInv}
      />
    </div>
  );
}
