import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileDown, FileSpreadsheet, BarChart3, Filter, Search, ArrowLeft,
  TrendingUp, ShoppingCart, Wallet, Factory, Receipt, LineChart,
  ClipboardList, ShieldCheck, Layers, Contact2, CalendarClock, BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel, type ExportColumn } from "@/lib/exporters";
import { downloadReportPdf, inrText, inrCompact } from "@/lib/reportPdf";
import { toast } from "sonner";
import { reportsApi, type ReportModule } from "@/lib/api/reports";

type Preset = "today" | "week" | "month" | "year" | "custom";
type Category = "Financial" | "Sales" | "Purchase" | "Inventory" | "GST" | "Parties";

interface ReportRow {
  date: string;
  reference: string;
  category: string;
  party: string;
  amount: number;
  status: string;
}

interface ReportDef {
  key: string;
  label: string;
  description: string;
  category: Category;
  icon: LucideIcon;
  /** Inline module report (fetched from /admin/reports?module=). */
  module?: ReportModule;
  /** Dedicated page — the card navigates instead of opening inline. */
  href?: string;
  /** Header for the amount column + KPI labels. */
  amountLabel?: string;
  /** false → amount is a quantity, not money. */
  amountIsMoney?: boolean;
  /** false → snapshot report, no date range (e.g. stock valuation). */
  dateRanged?: boolean;
}

const REPORTS: ReportDef[] = [
  // Financial
  { key: "payments", label: "Cash Movements", description: "Money in from collections, money out on expenses.", category: "Financial", icon: Wallet, module: "payments" },
  { key: "expenses", label: "Expense Report", description: "Operating spend grouped by category and vendor.", category: "Financial", icon: Receipt, module: "expenses" },
  { key: "forecast", label: "Revenue Forecast", description: "Projected revenue from the last quarter's run-rate.", category: "Financial", icon: LineChart, module: "forecast" },
  // Sales
  { key: "sales", label: "Sales Register", description: "Every tax invoice raised in the period.", category: "Sales", icon: TrendingUp, module: "sales" },
  { key: "orders", label: "Orders Report", description: "Customer & dealer orders, retail vs wholesale.", category: "Sales", icon: ShoppingCart, module: "orders" },
  // Purchase
  { key: "purchase", label: "Purchase Register", description: "Purchase orders by vendor with payment status.", category: "Purchase", icon: ClipboardList, module: "purchase" },
  // Inventory & Production
  { key: "production", label: "Production Output", description: "Finished-goods output per production run.", category: "Inventory", icon: Factory, module: "production", amountLabel: "Output Qty", amountIsMoney: false },
  { key: "stock_valuation", label: "Stock Valuation", description: "On-hand value per item, at standard cost.", category: "Inventory", icon: Layers, module: "stock_valuation", amountLabel: "Stock Value (₹)", dateRanged: false },
  // GST
  { key: "gst", label: "GST Output Register", description: "Output tax per invoice — CGST+SGST vs IGST.", category: "GST", icon: ShieldCheck, module: "gst", amountLabel: "GST (₹)" },
  // Parties (dedicated pages)
  { key: "customers", label: "Customer-wise Sales", description: "Invoiced, paid and outstanding per customer.", category: "Parties", icon: Contact2, href: "/customer-report" },
  { key: "monthly", label: "Monthly Company Report", description: "Invoiced, collected, expenses & net per month.", category: "Parties", icon: CalendarClock, href: "/monthly-report" },
  { key: "ledger", label: "Customer Ledger", description: "Running-balance statement for one customer.", category: "Parties", icon: BookOpen, href: "/customer-ledger" },
];

const CATEGORIES: Category[] = ["Financial", "Sales", "Purchase", "Inventory", "GST", "Parties"];
const CAT_ICON: Record<Category, string> = {
  Financial: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  Sales: "bg-primary/10 text-primary",
  Purchase: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  Inventory: "bg-sky-100/70 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  GST: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  Parties: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
};

const inr = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);
const minus = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");

  const active = REPORTS.find((r) => r.key === activeKey) ?? null;

  const openReport = (def: ReportDef) => {
    if (def.href) { navigate(def.href); return; }
    setActiveKey(def.key);
  };

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return REPORTS;
    return REPORTS.filter((r) =>
      r.label.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q));
  }, [catalogSearch]);

  if (active && active.module) {
    return <ReportView def={active} onBack={() => setActiveKey(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Center</h1>
          <p className="text-muted-foreground">Every operational and financial report in one place — each exports to a branded PDF or Excel.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search reports…" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const items = filteredCatalog.filter((r) => r.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((def) => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.key}
                    onClick={() => openReport(def)}
                    className="group text-left rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 rounded-lg p-2.5 ${CAT_ICON[def.category]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-card-foreground group-hover:text-primary transition-colors">{def.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{def.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      {def.href
                        ? <span className="inline-flex items-center gap-1"><FileDown className="h-3.5 w-3.5" /> Open report</span>
                        : <>
                            <span className="inline-flex items-center gap-1"><FileDown className="h-3.5 w-3.5" /> PDF</span>
                            <span className="opacity-40">·</span>
                            <span className="inline-flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</span>
                          </>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ReportView({ def, onBack }: { def: ReportDef; onBack: () => void }) {
  const dateRanged = def.dateRanged !== false;
  const isMoney = def.amountIsMoney !== false;
  const amountHeader = def.amountLabel ?? "Amount (₹)";

  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(minus(30));
  const [to, setTo] = useState(today());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [allRows, setAllRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setCategory("all"); }, [def.key]);

  useEffect(() => {
    setLoading(true);
    reportsApi.fetch(def.module!, from, to)
      .then((rows) => setAllRows((rows as ReportRow[]) ?? []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [def.module, from, to]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.category))).sort(),
    [allRows],
  );

  const onPreset = (p: Preset) => {
    setPreset(p);
    if (p === "today") { setFrom(today()); setTo(today()); }
    else if (p === "week") { setFrom(minus(7)); setTo(today()); }
    else if (p === "month") { setFrom(minus(30)); setTo(today()); }
    else if (p === "year") { setFrom(minus(365)); setTo(today()); }
  };

  const rows = useMemo(() => allRows.filter((r) => {
    if (category !== "all" && r.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.reference.toLowerCase().includes(q) &&
          !r.party.toLowerCase().includes(q) &&
          !r.category.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [allRows, search, category]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { count: rows.length, total, avg: rows.length ? total / rows.length : 0 };
  }, [rows]);

  const fmtAmount = (n: number) => (isMoney ? inr(n) : n.toLocaleString("en-IN"));
  const period = dateRanged ? `Period: ${from} → ${to}` : `As of ${today()}`;
  const meta = [`${rows.length} records`, category === "all" ? "All categories" : `Category: ${category}`];

  const excelColumns: ExportColumn<ReportRow>[] = [
    { header: "Date", key: "date" },
    { header: "Reference", key: "reference" },
    { header: "Category", key: "category" },
    { header: "Party / Source", key: "party" },
    { header: amountHeader, key: (r) => (isMoney ? r.amount.toLocaleString("en-IN") : String(r.amount)) },
    { header: "Status", key: "status" },
  ];

  const onExportExcel = () => {
    if (!rows.length) { toast.error("No rows to export"); return; }
    exportToExcel({ sheetName: def.label, columns: excelColumns, rows, filename: `${def.key}-report` });
    toast.success("Excel generated");
  };

  const onExportPdf = async () => {
    if (!rows.length) { toast.error("No rows to export"); return; }
    try {
      await downloadReportPdf({
        title: def.label,
        subtitle: period,
        meta,
        kpis: [
          { label: "Records", value: String(stats.count), tone: "brand" },
          { label: isMoney ? "Total" : `Total ${amountHeader}`, value: isMoney ? inrCompact(stats.total) : stats.total.toLocaleString("en-IN"), tone: "brand" },
          { label: "Average", value: isMoney ? inrCompact(stats.avg) : Math.round(stats.avg).toLocaleString("en-IN"), tone: "muted" },
        ],
        tables: [{
          columns: [
            { header: "Date", key: "date" },
            { header: "Reference", key: "reference" },
            { header: "Category", key: "category" },
            { header: "Party / Source", key: "party" },
            { header: amountHeader, key: (r: ReportRow) => (isMoney ? inrText(r.amount) : String(r.amount)), align: "right" },
            { header: "Status", key: "status" },
          ],
          rows,
          totalsRow: ["", "", "", "Total", isMoney ? inrText(stats.total) : String(stats.total), ""],
        }],
        filename: `${def.key}-report`,
        orientation: "landscape",
        note: dateRanged ? "Figures computed live from recorded transactions in the selected period." : "Snapshot of current on-hand inventory at standard cost.",
      });
      toast.success("PDF generated");
    } catch {
      toast.error("Could not generate PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to reports"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{def.label}</h1>
            <p className="text-muted-foreground">{def.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExportExcel}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button onClick={onExportPdf}><FileDown className="h-4 w-4" /> Export PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-card-foreground">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {dateRanged && (
            <>
              <div className="md:col-span-2">
                <Label className="text-xs">Range preset</Label>
                <Select value={preset} onValueChange={(v) => onPreset(v as Preset)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last 12 months</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} /></div>
              <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} /></div>
            </>
          )}
          <div className={dateRanged ? "md:col-span-1" : "md:col-span-2"}>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={dateRanged ? "md:col-span-6 lg:col-span-2" : "md:col-span-2"}>
            <Label className="text-xs">Search</Label>
            <Input placeholder="reference, party, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Records" value={String(stats.count)} subtitle="in selected range" icon={BarChart3} />
        <StatCard title={isMoney ? "Total" : `Total ${amountHeader}`} value={fmtAmount(stats.total)} subtitle="aggregate value" icon={FileDown} />
        <StatCard title="Average" value={fmtAmount(Math.round(stats.avg))} subtitle="per record" icon={FileSpreadsheet} subtitleColor="muted" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <ScrollableX>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Party / Source</th>
                <th className="text-right px-4 py-3 font-medium">{amountHeader}</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No records in this range.</td></tr>
              )}
              {!loading && rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-card-foreground">{r.reference}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{r.category}</span></td>
                  <td className="px-4 py-3">{r.party}</td>
                  <td className="px-4 py-3 text-right font-semibold eco-nums">{fmtAmount(r.amount)}</td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground capitalize">{r.status}</span></td>
                </tr>
              ))}
              {!loading && rows.length > 0 && (
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-3" colSpan={4}>Total · {rows.length} records</td>
                  <td className="px-4 py-3 text-right eco-nums">{fmtAmount(stats.total)}</td>
                  <td className="px-4 py-3" />
                </tr>
              )}
            </tbody>
          </table>
        </ScrollableX>
      </div>
    </div>
  );
}
