import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Pencil, Plus, Building2, ShoppingBag, IndianRupee, PackageMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination, usePagedRows } from "@/components/Pagination";
import { phase2Api, type ApiRow } from "@/lib/api/phase2";

const err = (e: unknown, f: string) => (e instanceof Error ? e.message : f);
const inr = (n: unknown) => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const s = (v: unknown) => String(v ?? "").trim();
const any = (...vals: unknown[]) => vals.some((v) => s(v) !== "");

const PO_STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  billed: "bg-primary/10 text-primary border-primary/20",
  received: "bg-primary/10 text-primary border-primary/20",
  partially_received: "bg-amber-50 text-amber-700 border-amber-200",
  issued: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  short_closed: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-muted text-muted-foreground border-border",
};
const PAY_STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  unpaid: "bg-red-50 text-red-600 border-red-200",
};

export default function VendorDetail() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/purchase/vendors");
  const { id } = useParams();
  const vendorId = Number(id);

  const [vendor, setVendor] = useState<ApiRow | null>(null);
  const [orders, setOrders] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, pos] = await Promise.all([
        phase2Api.vendors.get(vendorId),
        phase2Api.purchaseOrders.list({ vendor_id: vendorId, limit: 200 }).catch(() => [] as ApiRow[]),
      ]);
      setVendor(v);
      setOrders(Array.isArray(pos) ? pos : []);
    } catch (e) {
      toast.error(err(e, "Failed to load vendor"));
    } finally {
      setLoading(false);
    }
  }, [vendorId]);
  useEffect(() => { if (vendorId > 0) load(); }, [vendorId, load]);

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const open = orders.filter((o) => !["paid", "cancelled"].includes(String(o.status ?? "").toLowerCase())).length;
    return { count: orders.length, totalValue, open };
  }, [orders]);

  const paged = usePagedRows(orders);

  // Compose the address blocks (multi-line) from their parts.
  const billingLines = useMemo(() => {
    if (!vendor) return [] as string[];
    return [
      s(vendor.billing_attention),
      s(vendor.address),
      s(vendor.billing_street2),
      [s(vendor.city), s(vendor.state), s(vendor.pincode)].filter(Boolean).join(", "),
      s(vendor.billing_country),
    ].filter(Boolean);
  }, [vendor]);
  const shippingLines = useMemo(() => {
    if (!vendor) return [] as string[];
    return [
      s(vendor.shipping_attention),
      s(vendor.shipping_street1),
      s(vendor.shipping_street2),
      [s(vendor.shipping_city), s(vendor.shipping_state), s(vendor.shipping_pincode)].filter(Boolean).join(", "),
      s(vendor.shipping_country),
    ].filter(Boolean);
  }, [vendor]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading vendor…</div>;
  if (!vendor) return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-muted-foreground">Vendor not found.</p>
      <Button variant="outline" onClick={() => navigate("/purchase/vendors")}><ArrowLeft className="h-4 w-4" /> Back to Vendors</Button>
    </div>
  );

  const active = vendor.is_active === undefined ? true : !!Number(vendor.is_active);
  const openingBalance = Number(vendor.opening_balance ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{s(vendor.name)}</h1>
              <StatusBadge value={active ? "active" : "inactive"} styleMap={{ active: "bg-emerald-50 text-emerald-700 border-emerald-200", inactive: "bg-muted text-muted-foreground border-border" }} />
              {!!Number(vendor.msme_registered) && (
                <StatusBadge value="MSME" styleMap={{ msme: "bg-violet-50 text-violet-700 border-violet-200" }} />
              )}
            </div>
            <p className="text-muted-foreground">{s(vendor.vendor_code)}{s(vendor.gstin) ? ` · GSTIN ${s(vendor.gstin)}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => navigate(`/purchase/orders/new?vendor_id=${vendorId}`)}><Plus className="h-4 w-4" /> New PO</Button>
          <Button variant="outline" onClick={() => navigate(`/purchase/vendors/${vendorId}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Purchase orders" value={String(stats.count)} subtitle="all time" icon={ShoppingBag} />
        <StatCard title="Total ordered" value={inr(stats.totalValue)} subtitle="across all POs" icon={IndianRupee} subtitleColor="primary" />
        <StatCard title="Open POs" value={String(stats.open)} subtitle="not paid / cancelled" icon={PackageMinus} subtitleColor={stats.open ? "muted" : "primary"} />
      </div>

      {/* Vendor details — every filled field, grouped */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></span>
          <h2 className="text-base font-semibold text-card-foreground">Vendor Details</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {any(vendor.company_name, vendor.contact_name, vendor.phone, vendor.mobile, vendor.email) && (
            <Section title="Contact">
              <Row label="Company" value={s(vendor.company_name)} />
              <Row label="Contact person" value={s(vendor.contact_name)} />
              <Row label="Work phone" value={s(vendor.phone)} />
              <Row label="Mobile" value={s(vendor.mobile)} />
              <Row label="Email" value={s(vendor.email)} />
            </Section>
          )}

          {any(vendor.gstin, vendor.pan, vendor.payment_terms) || !!Number(vendor.msme_registered) || openingBalance !== 0 ? (
            <Section title="Other Details">
              <Row label="GSTIN" value={s(vendor.gstin)} />
              <Row label="PAN" value={s(vendor.pan)} />
              <Row label="MSME registered" value={Number(vendor.msme_registered) ? "Yes" : ""} />
              <Row label="Opening balance" value={openingBalance !== 0 ? inr(openingBalance) : ""} />
              <Row label="Payment terms" value={s(vendor.payment_terms)} />
            </Section>
          ) : null}

          {any(vendor.bank_account_holder, vendor.bank_name, vendor.bank_account_number, vendor.bank_ifsc) && (
            <Section title="Bank Details">
              <Row label="Account holder" value={s(vendor.bank_account_holder)} />
              <Row label="Bank" value={s(vendor.bank_name)} />
              <Row label="Account no." value={s(vendor.bank_account_number)} />
              <Row label="IFSC" value={s(vendor.bank_ifsc)} />
            </Section>
          )}

          {(billingLines.length > 0 || any(vendor.billing_phone, vendor.billing_fax)) && (
            <Section title="Billing Address">
              {billingLines.length > 0 && <div className="text-sm text-card-foreground whitespace-pre-line">{billingLines.join("\n")}</div>}
              <Row label="Phone" value={s(vendor.billing_phone)} />
              <Row label="Fax" value={s(vendor.billing_fax)} />
            </Section>
          )}

          {(shippingLines.length > 0 || any(vendor.shipping_phone, vendor.shipping_fax)) && (
            <Section title="Shipping Address">
              {shippingLines.length > 0 && <div className="text-sm text-card-foreground whitespace-pre-line">{shippingLines.join("\n")}</div>}
              <Row label="Phone" value={s(vendor.shipping_phone)} />
              <Row label="Fax" value={s(vendor.shipping_fax)} />
            </Section>
          )}

          {s(vendor.notes) && (
            <Section title="Remarks">
              <div className="text-sm text-card-foreground whitespace-pre-line">{s(vendor.notes)}</div>
            </Section>
          )}
        </div>
      </div>

      {/* Purchase orders */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-base font-semibold text-card-foreground">Purchase Orders <span className="text-muted-foreground font-normal">({orders.length})</span></h2>
        </div>
        <ScrollableX>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">PO #</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Payment</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No purchase orders for this vendor yet.</td></tr>}
              {paged.rows.map((o) => (
                <tr key={o.po_id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/purchase/orders/${o.po_id}`)}>
                  <td className="px-4 py-3 font-medium text-card-foreground">{o.po_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.order_date}</td>
                  <td className="px-4 py-3"><StatusBadge value={String(o.status ?? "").toLowerCase()} styleMap={PO_STATUS_STYLES} /></td>
                  <td className="px-4 py-3"><StatusBadge value={String(o.payment_status ?? "unpaid").toLowerCase()} styleMap={PAY_STATUS_STYLES} /></td>
                  <td className="px-4 py-3 text-right eco-nums font-medium">{inr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableX>
        <Pagination {...paged} onPage={paged.setPage} noun="POs" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

/** A label/value row that hides itself when the value is empty. */
function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-card-foreground text-right">{value}</dd>
    </div>
  );
}
