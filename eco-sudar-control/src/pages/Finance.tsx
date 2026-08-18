import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt, Activity,
  Percent, Scale, Target, Layers, Sparkles, Lightbulb, ShieldAlert, CheckCircle2, RefreshCw, Loader2,
  Download, FileText, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/StatCard";
import { financeApi, type FinancialRatios, type MonthlyPoint } from "@/lib/api/finance";
import { downloadReportPdf, inrText, inrCompact } from "@/lib/reportPdf";
import { exportWorkbook } from "@/lib/exporters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const k = (n: number) => `₹${(n / 1000).toFixed(0)}k`;

/** Indian fiscal year (Apr 1 → Mar 31) covering today. */
function currentFyRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}
function isoMonthsAgo(m: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
}

/** Honest period-over-period delta from the monthly series (last vs previous month). */
function monthDelta(series: MonthlyPoint[], key: keyof MonthlyPoint): string {
  if (!series || series.length < 2) return "this period";
  const last = Number(series[series.length - 1][key]);
  const prev = Number(series[series.length - 2][key]);
  if (!prev) return "this period";
  const change = ((last - prev) / Math.abs(prev)) * 100;
  const arrow = change >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(change).toFixed(1)}% vs previous month`;
}

const PIE_COLORS = [
  "hsl(200,70%,52%)", "hsl(210,70%,55%)", "hsl(30,90%,52%)",
  "hsl(280,55%,52%)", "hsl(45,90%,50%)", "hsl(0,72%,51%)",
  "hsl(170,55%,42%)", "hsl(330,60%,55%)",
];

interface RatioMeta {
  key: keyof FinancialRatios;
  label: string;
  hint: string;
  benchmark: string;
  format: "pct" | "x";
  icon: typeof Percent;
  good: (v: number) => boolean;
}

const RATIO_DEFS: RatioMeta[] = [
  { key: "profitMargin", label: "Profit Margin", hint: "Net Profit / Revenue", benchmark: "Healthy: > 15%", format: "pct", icon: Percent, good: (v) => v > 0.15 },
  { key: "expenseRatio", label: "Expense Ratio", hint: "Expenses / Revenue", benchmark: "Target: < 75%", format: "pct", icon: Receipt, good: (v) => v < 0.75 },
  { key: "roi", label: "ROI", hint: "Return on Investment", benchmark: "Healthy: > 20%", format: "pct", icon: Target, good: (v) => v > 0.20 },
  { key: "currentRatio", label: "Current Ratio", hint: "Assets / Liabilities", benchmark: "Healthy: 1.5 – 3.0", format: "x", icon: Scale, good: (v) => v >= 1.5 && v <= 3 },
  { key: "grossMargin", label: "Gross Margin", hint: "Gross Profit / Revenue", benchmark: "Industry: > 25%", format: "pct", icon: Layers, good: (v) => v > 0.25 },
  { key: "operatingMargin", label: "Operating Margin", hint: "Operating Profit / Revenue", benchmark: "Healthy: > 12%", format: "pct", icon: Activity, good: (v) => v > 0.12 },
];

export default function Finance() {
  const [pnl, setPnl] = useState<Awaited<ReturnType<typeof financeApi.pnl>> | null>(null);
  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof financeApi.aiAnalysis>> | null>(null);
  const [aiPending, setAiPending] = useState(false);

  // Empty range → let the backend pick its own default period (first load).
  const load = useCallback((f: string, t: string) => {
    setLoading(true);
    const args = f || t ? { from: f || undefined, to: t || undefined } : undefined;
    Promise.all([financeApi.pnl(args), financeApi.ratios(args)])
      .then(([p, r]) => { setPnl(p); setRatios(r); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load financials"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load("", ""); }, [load]);

  const applyPreset = (range: { from: string; to: string }) => {
    setFrom(range.from); setTo(range.to); load(range.from, range.to);
  };
  const resetRange = () => { setFrom(""); setTo(""); load("", ""); };
  const fy = currentFyRange();
  const fyLabel = `FY ${fy.from.slice(0, 4)}–${String(Number(fy.from.slice(0, 4)) + 1).slice(2)}`;

  const runAiAnalysis = async () => {
    setAiPending(true);
    try {
      const result = await financeApi.aiAnalysis();
      setAiResult(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setAiPending(false);
    }
  };

  const ratioText = (def: RatioMeta, r: FinancialRatios) => {
    const v = r[def.key] as number;
    return def.format === "pct" ? pct(v) : `${v.toFixed(2)}x`;
  };

  const downloadPdf = async () => {
    if (!pnl || !ratios) return;
    setDownloading(true);
    try {
      const sumRev = pnl.monthly.reduce((s, m) => s + m.revenue, 0);
      const sumExp = pnl.monthly.reduce((s, m) => s + m.expenses, 0);
      const sumProfit = pnl.monthly.reduce((s, m) => s + m.profit, 0);
      const sumBreak = pnl.expenseBreakdown.reduce((s, e) => s + e.amount, 0);
      const sumSrc = pnl.revenueBreakdown.reduce((s, e) => s + e.amount, 0);
      await downloadReportPdf({
        title: "Profit & Loss Statement",
        subtitle: `Period: ${pnl.periodFrom} → ${pnl.periodTo}`,
        meta: [`${pnl.monthly.length} months`, "EcoSudar"],
        kpis: [
          { label: "Revenue", value: inrCompact(pnl.revenue), tone: "brand" },
          { label: "Expenses", value: inrCompact(pnl.expenses), tone: "muted" },
          { label: "Gross Profit", value: inrCompact(pnl.grossProfit), tone: pnl.grossProfit >= 0 ? "positive" : "negative" },
          { label: pnl.netProfit >= 0 ? "Net Profit" : "Net Loss", value: inrCompact(Math.abs(pnl.netProfit)), tone: pnl.netProfit >= 0 ? "positive" : "negative" },
        ],
        tables: [
          {
            title: "Monthly performance",
            columns: [
              { header: "Month", key: "month" },
              { header: "Revenue", key: (r: MonthlyPoint) => inrText(r.revenue), align: "right" },
              { header: "Expenses", key: (r: MonthlyPoint) => inrText(r.expenses), align: "right" },
              { header: "Profit", key: (r: MonthlyPoint) => inrText(r.profit), align: "right" },
            ],
            rows: pnl.monthly,
            totalsRow: ["Total", inrText(sumRev), inrText(sumExp), inrText(sumProfit)],
          },
          {
            title: "Expense breakdown",
            columns: [
              { header: "Category", key: "category" },
              { header: "Amount", key: (r: { amount: number }) => inrText(r.amount), align: "right" },
            ],
            rows: pnl.expenseBreakdown,
            totalsRow: ["Total", inrText(sumBreak)],
          },
          {
            title: "Revenue by source",
            columns: [
              { header: "Source", key: "source" },
              { header: "Amount", key: (r: { amount: number }) => inrText(r.amount), align: "right" },
            ],
            rows: pnl.revenueBreakdown,
            totalsRow: ["Total", inrText(sumSrc)],
          },
          {
            title: "Financial ratios",
            columns: [
              { header: "Metric", key: "label" },
              { header: "Value", key: "value", align: "right" },
              { header: "Benchmark", key: "benchmark" },
            ],
            rows: RATIO_DEFS.map((d) => ({ label: d.label, value: ratioText(d, ratios), benchmark: d.benchmark })),
          },
        ],
        filename: "profit-and-loss",
        orientation: "portrait",
        note: "Figures computed live from recorded transactions.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setDownloading(false);
    }
  };

  const downloadExcel = () => {
    if (!pnl || !ratios) return;
    try {
      exportWorkbook("profit-and-loss", [
        { name: "Summary", rows: [{
          Period: `${pnl.periodFrom} → ${pnl.periodTo}`,
          Revenue: pnl.revenue, Expenses: pnl.expenses,
          "Gross Profit": pnl.grossProfit, Taxes: pnl.taxes, "Net Profit": pnl.netProfit,
        }] },
        { name: "Monthly", rows: pnl.monthly.map((m) => ({ Month: m.month, Revenue: m.revenue, Expenses: m.expenses, Profit: m.profit })) },
        { name: "Expense Breakdown", rows: pnl.expenseBreakdown.map((e) => ({ Category: e.category, Amount: e.amount })) },
        { name: "Revenue by Source", rows: pnl.revenueBreakdown.map((r) => ({ Source: r.source, Amount: r.amount })) },
        { name: "Ratios", rows: RATIO_DEFS.map((d) => ({ Metric: d.label, Value: ratios[d.key], Benchmark: d.benchmark })) },
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Excel export failed");
    }
  };

  if (!pnl || !ratios) {
    return <div className="text-center py-20 text-muted-foreground">Loading financial dashboard…</div>;
  }

  const profitable = pnl.netProfit >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profit & Loss</h1>
          <p className="text-muted-foreground">
            Period: {pnl.periodFrom} → {pnl.periodTo} · Real-time financial overview & key ratios.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadPdf}><FileText className="h-4 w-4" /> Download P&L (PDF)</DropdownMenuItem>
            <DropdownMenuItem onClick={downloadExcel}><FileSpreadsheet className="h-4 w-4" /> Download P&L (Excel)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date-range filter */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <Button onClick={() => load(from, to)} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Apply
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset(fy)}>{fyLabel}</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset({ from: isoMonthsAgo(6), to: new Date().toISOString().slice(0, 10) })}>Last 6 months</Button>
          <Button variant="ghost" size="sm" onClick={resetRange}>Reset</Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={inr(pnl.revenue)} subtitle={monthDelta(pnl.monthly, "revenue")} icon={Wallet} />
        <StatCard title="Total Expenses" value={inr(pnl.expenses)} subtitle={monthDelta(pnl.monthly, "expenses")} icon={Receipt} subtitleColor="muted" />
        <StatCard title="Gross Profit" value={inr(pnl.grossProfit)} subtitle={`Tax: ${inr(pnl.taxes)}`} icon={TrendingUp} />
        <StatCard
          title={profitable ? "Net Profit" : "Net Loss"}
          value={inr(Math.abs(pnl.netProfit))}
          subtitle={profitable ? "after taxes" : "deficit"}
          icon={profitable ? PiggyBank : TrendingDown}
        />
      </div>

      {/* AI Financial Analyst */}
      {(() => {
        const a = aiResult;
        const score = a?.health_score ?? 0;
        const scoreTone = score >= 70 ? "text-emerald-600" : score >= 45 ? "text-amber-600" : "text-red-600";
        const scoreRing = score >= 70 ? "border-emerald-500" : score >= 45 ? "border-amber-500" : "border-red-500";
        return (
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-card-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> AI Financial Analyst
              </div>
              <Button size="sm" variant={a ? "outline" : "default"} disabled={aiPending} onClick={runAiAnalysis} className="gap-1.5">
                {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : a ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {aiPending ? "Analysing…" : a ? "Re-analyse" : "Analyse this period"}
              </Button>
            </div>

            {!a && !aiPending && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Get a plain-language read of this period — health score, what's driving profit, risks and recommendations.
                <br />Built from the exact figures above. Only aggregated totals are sent to the AI.
              </div>
            )}
            {aiPending && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Reading your numbers…
              </div>
            )}

            {a && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className={cn("flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4", scoreRing)}>
                    <span className={cn("text-xl font-bold leading-none", scoreTone)}>{score}</span>
                    <span className="text-[9px] text-muted-foreground">health</span>
                  </div>
                  <div className="min-w-0">
                    {a.headline && <p className="font-semibold text-card-foreground">{a.headline}</p>}
                    {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <AiList title="Drivers" icon={TrendingUp} tone="text-blue-600" items={a.drivers} />
                  <AiList title="Risks" icon={ShieldAlert} tone="text-red-600" items={a.risks} />
                  <AiList title="Recommendations" icon={Lightbulb} tone="text-emerald-600" items={a.recommendations} />
                </div>

                {a.outlook && (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><span className="font-medium">Outlook: </span>{a.outlook}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">AI-generated from your figures · {a.generated_at} · verify before acting.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Revenue vs Expenses area + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-card-foreground">Revenue vs Expenses</h3>
              <p className="text-xs text-muted-foreground">Monthly performance trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={pnl.monthly}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(200,70%,52%)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(200,70%,52%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0,72%,51%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={k} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="hsl(200,70%,52%)" fill="url(#rev)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" fill="url(#exp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-1">Expense Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Share by category</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pnl.expenseBreakdown} dataKey="amount" nameKey="category" outerRadius={90} innerRadius={50}>
                {pnl.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => inr(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit trend line + Revenue sources bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-1">Net Profit Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Profit by month</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={pnl.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={k} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Line type="monotone" dataKey="profit" stroke="hsl(210,70%,55%)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-1">Revenue by Source</h3>
          <p className="text-xs text-muted-foreground mb-4">Sales channel contribution</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pnl.revenueBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="source" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={k} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Ratios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Financial Ratios</h2>
            <p className="text-sm text-muted-foreground">Key health indicators auto-computed from current data</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Investment base: {inr(ratios.investment)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RATIO_DEFS.map((def) => {
            const val = ratios[def.key] as number;
            const display = def.format === "pct" ? pct(val) : `${val.toFixed(2)}x`;
            const ok = def.good(val);
            const Icon = def.icon;
            return (
              <div key={def.key} className="bg-card rounded-xl border p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{def.label}</p>
                      <p className="text-xs text-muted-foreground">{def.hint}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {ok ? "Healthy" : "Watch"}
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{display}</div>
                <p className="text-xs text-muted-foreground mt-1">{def.benchmark}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AiList({ title, icon: Icon, tone, items }: { title: string; icon: typeof Percent; tone: string; items: string[] }) {
  return (
    <div className="rounded-lg border p-3">
      <div className={cn("mb-2 flex items-center gap-1.5 text-sm font-medium", tone)}><Icon className="h-4 w-4" /> {title}</div>
      {items && items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {items.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-muted-foreground/50">•</span><span>{t}</span></li>)}
        </ul>
      ) : <p className="text-sm text-muted-foreground/60">—</p>}
    </div>
  );
}
