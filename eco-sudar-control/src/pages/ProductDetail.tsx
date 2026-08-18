import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Pencil, Package, Boxes, IndianRupee, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { StatCard } from "@/components/StatCard";
import { Pagination, usePagedRows } from "@/components/Pagination";
import { fetchProducts, type UIProduct } from "@/lib/api/products";
import { inventoryApi, qty, inr, type StockItem, type Movement } from "@/lib/api/inventory";

const err = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

const MOVE_STYLES: Record<string, string> = {
  in: "bg-emerald-50 text-emerald-700 border-emerald-200",
  out: "bg-destructive/10 text-destructive border-destructive/20",
  adjust: "bg-amber-50 text-amber-700 border-amber-200",
};
const MOVE_LABEL: Record<string, string> = { in: "Stock in", out: "Stock out", adjust: "Correction" };

export default function ProductDetail() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/products");
  const { id } = useParams();
  const productId = Number(id);

  const [product, setProduct] = useState<UIProduct | null>(null);
  const [stock, setStock] = useState<StockItem | null>(null);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products, stockItems, allMoves] = await Promise.all([
        fetchProducts(),
        inventoryApi.stock().catch(() => [] as StockItem[]),
        inventoryApi.movements("finished").catch(() => [] as Movement[]),
      ]);
      setProduct(products.find((p) => p.id === productId) ?? null);
      setStock(stockItems.find((s) => s.product_id === productId) ?? null);
      setMoves(allMoves.filter((m) => Number(m.product_id) === productId));
    } catch (e) {
      toast.error(err(e, "Failed to load product"));
    } finally {
      setLoading(false);
    }
  }, [productId]);
  useEffect(() => { if (productId > 0) load(); }, [productId, load]);

  const stats = useMemo(() => {
    const inQty = moves.filter((m) => m.movement_type === "in").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    const outQty = moves.filter((m) => m.movement_type === "out").reduce((s, m) => s + Number(m.quantity ?? 0), 0);
    return { inQty, outQty, count: moves.length };
  }, [moves]);

  const paged = usePagedRows(moves);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading product…</div>;
  if (!product) return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-muted-foreground">Product not found.</p>
      <Button variant="outline" onClick={() => navigate("/products")}><ArrowLeft className="h-4 w-4" /> Back to Products</Button>
    </div>
  );

  const basePrice = Number(product._raw?.base_price ?? stock?.base_price ?? 0);
  const unit = product._raw?.unit ?? stock?.unit ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-start gap-3">
            {product.imageUrl && <img src={product.imageUrl} alt={product.product} className="h-12 w-12 rounded-lg object-cover border" />}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{product.product}</h1>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">{product.category}</span>
              </div>
              <p className="text-muted-foreground">{product.description || "Finished-goods catalogue item"}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate(`/products/${productId}/edit`)}><Pencil className="h-4 w-4" /> Edit</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Current stock" value={stock ? qty(stock.stock_quantity) : "—"} subtitle={unit || "on hand"} icon={Boxes} subtitleColor="primary" />
        <StatCard title="Base price" value={inr(basePrice)} subtitle={unit ? `per ${unit}` : "list price"} icon={IndianRupee} />
        <StatCard title="Stock value" value={stock ? inr(stock.stock_value) : "—"} subtitle="on hand" icon={IndianRupee} subtitleColor="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Package className="h-4 w-4 text-primary" /></span>
            <h2 className="text-base font-semibold text-card-foreground">Product Details</h2>
          </div>
          <dl className="p-4 space-y-3 text-sm">
            <Field label="Category" value={product.category} />
            <Field label="Unit" value={unit} />
            <Field label="Base price" value={inr(basePrice)} />
            <Field label="Min order qty" value={product.minOrderQty ? String(product.minOrderQty) : null} />
            <Field label="Purposes" value={product.purposes.length ? product.purposes.join(", ") : null} />
          </dl>
          {product.sizes.length > 0 && (
            <div className="border-t p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sizes &amp; Prices</h3>
              <ul className="space-y-1 text-sm">
                {product.sizes.map((s, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span className="text-card-foreground">{s.size}</span>
                    <span className="text-muted-foreground">{s.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Movement history */}
        <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-base font-semibold text-card-foreground">Stock Movements <span className="text-muted-foreground font-normal">({moves.length})</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">Production output in, delivery challans out, and corrections. {stats.count > 0 ? `+${qty(stats.inQty)} / −${qty(stats.outQty)}` : ""}</p>
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
                  <tr key={`${m.stock_movement_id ?? m.product_id}-${i}`} className="border-t">
                    <td className="px-4 py-3 text-muted-foreground">{m.movement_date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MOVE_STYLES[m.movement_type] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {MOVE_LABEL[m.movement_type] ?? m.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right eco-nums">{qty(m.quantity, unit)}</td>
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
