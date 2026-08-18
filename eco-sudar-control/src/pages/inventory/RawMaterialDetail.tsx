import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Pencil, Leaf, Boxes, ArrowDownUp, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { StatCard } from "@/components/StatCard";
import { Pagination, usePagedRows } from "@/components/Pagination";
import { inventoryApi, qty, type RawMaterial, type Movement } from "@/lib/api/inventory";

const err = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

const MOVE_STYLES: Record<string, string> = {
  in: "bg-emerald-50 text-emerald-700 border-emerald-200",
  out: "bg-destructive/10 text-destructive border-destructive/20",
  adjust: "bg-amber-50 text-amber-700 border-amber-200",
};
const MOVE_LABEL: Record<string, string> = { in: "Stock in", out: "Stock out", adjust: "Correction" };

export default function RawMaterialDetail() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/inventory/raw-materials");
  const { id } = useParams();
  const rawId = Number(id);

  const [item, setItem] = useState<RawMaterial | null>(null);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, allMoves] = await Promise.all([
        inventoryApi.rawMaterials(),
        inventoryApi.movements("raw").catch(() => [] as Movement[]),
      ]);
      setItem(list.find((m) => m.raw_material_id === rawId) ?? null);
      setMoves(allMoves.filter((m) => Number(m.raw_material_id) === rawId));
    } catch (e) {
      toast.error(err(e, "Failed to load raw material"));
    } finally {
      setLoading(false);
    }
  }, [rawId]);
  useEffect(() => { if (rawId > 0) load(); }, [rawId, load]);

  const stats = useMemo(() => {
    const inQty = moves.filter((m) => m.movement_type === "in").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    const outQty = moves.filter((m) => m.movement_type === "out").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    return { inQty, outQty, count: moves.length };
  }, [moves]);

  const paged = usePagedRows(moves);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading raw material…</div>;
  if (!item) return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-muted-foreground">Raw material not found.</p>
      <Button variant="outline" onClick={() => navigate("/inventory/raw-materials")}><ArrowLeft className="h-4 w-4" /> Back to Raw Materials</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
              {item.low_stock
                ? <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">Low stock</span>
                : <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">In stock</span>}
            </div>
            <p className="text-muted-foreground">{item.supplier ? `Supplier: ${item.supplier}` : "Biomass feedstock"}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/inventory/raw-materials/${rawId}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Current stock" value={qty(item.current_stock)} subtitle={item.unit} icon={Boxes} subtitleColor="primary" />
        <StatCard title="Reorder level" value={qty(item.reorder_level)} subtitle={item.unit} icon={Leaf} />
        <StatCard title="Movements" value={String(stats.count)} subtitle={`+${qty(stats.inQty)} / −${qty(stats.outQty)}`} icon={ArrowDownUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Leaf className="h-4 w-4 text-primary" /></span>
            <h2 className="text-base font-semibold text-card-foreground">Material Details</h2>
          </div>
          <dl className="p-4 space-y-3 text-sm">
            <Field label="Unit" value={item.unit} />
            <Field label="Current stock" value={qty(item.current_stock, item.unit)} />
            <Field label="Reorder level" value={qty(item.reorder_level, item.unit)} />
            <Field label="Supplier" value={item.supplier ? <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {item.supplier}</span> : null} />
            <Field label="Status" value={item.low_stock ? "Low stock" : "In stock"} />
          </dl>
        </div>

        {/* Movement history */}
        <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold text-card-foreground">Stock Movements <span className="text-muted-foreground font-normal">({moves.length})</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stock-ins from POs, consumption in production, and corrections.</p>
          </div>
          <ScrollableX>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {moves.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No stock movements recorded yet.</td></tr>}
                {paged.rows.map((m, i) => (
                  <tr key={`${m.movement_id ?? m.raw_material_id}-${i}`} className="border-t">
                    <td className="px-4 py-3 text-muted-foreground">{m.movement_date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MOVE_STYLES[m.movement_type] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {MOVE_LABEL[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right eco-nums">{qty(m.quantity, item.unit)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.reference || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableX>
          <Pagination {...paged} onPage={paged.setPage} noun="movements" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-card-foreground text-right">{value || "—"}</dd>
    </div>
  );
}
