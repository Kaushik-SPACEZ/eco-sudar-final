import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ShoppingBag, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { FormPage } from "@/components/FormPage";
import { Req } from "@/components/Req";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollableX } from "@/components/ui/scrollable-x";
import { RecordCombobox } from "@/components/RecordCombobox";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { QuickCreateDialog } from "@/components/QuickCreateDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  VendorFields, vendorEmpty, validateVendor, buildVendorPayload, type VendorFormState,
} from "@/components/vendor/VendorFields";
import { phase2Api, type ApiRow } from "@/lib/api/phase2";
import { useUnsavedChanges } from "@/components/UnsavedChangesGuard";
import { UOM_OPTIONS, GST_RATES } from "@/lib/uom";
import { isGstin, isNumeric, firstError } from "@/lib/validate";

const today = () => new Date().toISOString().slice(0, 10);
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

interface Line {
  purchase_item_id: number | null;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  gst_rate: number;
}
const emptyLine = (): Line => ({ purchase_item_id: null, description: "", category: "", quantity: 1, unit: "nos", unit_price: 0, gst_rate: 18 });
const emptyForm = () => ({ vendor_id: 0, order_date: today(), expected_date: "", notes: "" });
type Form = ReturnType<typeof emptyForm>;

// Item type badge (mirrors the catalog). Derived from the selected purchase item — on
// receipt a stock/pellet item flows into finished stock, a raw material into raw stock.
const normType = (v: unknown) => {
  const s = String(v ?? "").toLowerCase();
  if (s === "raw_material") return "raw_material";
  if (s === "pellet" || s === "pellets" || s === "finished") return "pellet";
  return "stock";
};
const TYPE_META: Record<string, { label: string; badge: string }> = {
  stock:        { label: "Spares & Assets", badge: "bg-primary/10 text-primary border-primary/20" },
  raw_material: { label: "Raw Material",    badge: "bg-amber-50 text-amber-700 border-amber-200" },
  pellet:       { label: "Pellet",          badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const typeLabel = (v: unknown) => TYPE_META[normType(v)].label;
const typeBadge = (v: unknown) => TYPE_META[normType(v)].badge;

const emptyItem = () => ({ name: "", item_type: "stock", category: "", unit: "nos", rate: "", gst_rate: "18", hsn_code: "", specification: "" });

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;
  const [searchParams] = useSearchParams();
  const cloneFrom = !editing ? searchParams.get("from") : null;

  const [vendors, setVendors] = useState<ApiRow[]>([]);
  const [catalog, setCatalog] = useState<ApiRow[]>([]);
  const [form, setForm] = useState<Form>(emptyForm());
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [initial, setInitial] = useState(JSON.stringify({ form: emptyForm(), lines: [emptyLine()] }));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing || !!cloneFrom);

  // Inline "add new" popups
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState<VendorFormState>(vendorEmpty());
  const [vendorReAccount, setVendorReAccount] = useState("");
  const [vendorSaving, setVendorSaving] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem());
  const [itemSaving, setItemSaving] = useState(false);
  const [itemLineIdx, setItemLineIdx] = useState<number | null>(null);

  // Confirm before discarding a line that already has data typed into it.
  const [delIdx, setDelIdx] = useState<number | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  // Remove row i; if it's the only row, blank it instead so the table always has one.
  const rmLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLine()]);
  // A line counts as "filled" once it holds anything worth confirming before losing.
  const lineIsFilled = (l: Line) => !!(l.purchase_item_id || l.description.trim() || l.category.trim() || l.unit_price > 0 || l.quantity !== 1);
  // Blank rows vanish silently; rows with data ask first.
  const requestRemoveLine = (i: number) => {
    const l = lines[i];
    if (l && lineIsFilled(l)) setDelIdx(i);
    else rmLine(i);
  };

  const loadVendors = () => phase2Api.vendors.list().then(setVendors).catch(() => {});
  const loadCatalog = () => phase2Api.purchaseItems.list().then(setCatalog).catch(() => {});

  useEffect(() => {
    loadVendors();
    loadCatalog();
    // Prefill from an existing PO — either editing it, or cloning it into a new draft.
    const sourceId = editing ? Number(id) : cloneFrom ? Number(cloneFrom) : 0;
    if (!sourceId) return;
    setLoading(true);
    phase2Api.purchaseOrders.get(sourceId)
      .then((row: ApiRow) => {
        const f: Form = {
          vendor_id: Number(row.vendor_id ?? 0),
          // A clone is a fresh order: reset the dates, copy vendor + lines + notes.
          order_date: editing ? String(row.order_date ?? today()).slice(0, 10) : today(),
          expected_date: editing && row.expected_date ? String(row.expected_date).slice(0, 10) : "",
          notes: String(row.notes ?? ""),
        };
        setForm(f);
        const ls: Line[] = Array.isArray(row.items) && (row.items as Line[]).length
          ? (row.items as ApiRow[]).map((it) => ({
              purchase_item_id: it.purchase_item_id != null ? Number(it.purchase_item_id) : null,
              description: String(it.description ?? ""),
              category: String(it.category ?? ""),
              quantity: Number(it.quantity ?? 1),
              unit: String(it.unit ?? "nos"),
              unit_price: Number(it.unit_price ?? 0),
              gst_rate: Number(it.gst_rate ?? 18),
            }))
          : [emptyLine()];
        setLines(ls);
        setInitial(JSON.stringify({ form: f, lines: ls }));
      })
      .catch(() => toast.error(editing ? "Failed to load purchase order" : "Failed to load the PO to clone"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editing, cloneFrom]);

  // "New PO" launched from a vendor page preselects that vendor.
  useEffect(() => {
    const v = !editing && !cloneFrom ? searchParams.get("vendor_id") : null;
    if (!v) return;
    const f = { ...emptyForm(), vendor_id: Number(v) };
    setForm(f);
    setInitial(JSON.stringify({ form: f, lines: [emptyLine()] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => JSON.stringify({ form, lines }) !== initial, [form, lines, initial]);
  useUnsavedChanges(dirty && !saving && !vendorOpen && !itemOpen, "po-form");

  const selectedVendor = useMemo(() => vendors.find(v => Number(v.vendor_id) === Number(form.vendor_id)), [vendors, form.vendor_id]);
  const vendorGstin = String(selectedVendor?.gstin ?? "").toUpperCase();

  const lineTotal = (l: Line) => l.quantity * l.unit_price * (1 + l.gst_rate / 100);
  const grandTotal = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);

  // Distinct categories already used across the catalog + any typed on this form —
  // feeds the category dropdown (pick an existing one or add a brand-new one).
  const categoryOptions = useMemo(() => {
    const set = new Map<string, string>(); // lower → original casing
    for (const c of catalog) {
      const cat = String(c.category ?? "").trim();
      if (cat) set.set(cat.toLowerCase(), cat);
    }
    for (const l of lines) {
      const cat = l.category.trim();
      if (cat) set.set(cat.toLowerCase(), cat);
    }
    const cur = itemForm.category.trim();
    if (cur) set.set(cur.toLowerCase(), cur);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [catalog, lines, itemForm.category]);

  // Choosing an item from the catalog auto-fills description, category, unit, rate & GST.
  const pickItem = (i: number, itemId: number | string) => {
    const it = catalog.find(c => Number(c.purchase_item_id) === Number(itemId));
    if (!it) return;
    setLine(i, {
      purchase_item_id: Number(it.purchase_item_id),
      description: String(it.name ?? ""),
      category: String(it.category ?? ""),
      unit: String(it.unit ?? "nos"),
      unit_price: Number(it.rate ?? 0),
      gst_rate: Number(it.gst_rate ?? 18),
    });
  };

  // ── Inline vendor create ────────────────────────────────────────────────────
  // Uses the exact same field set as the standalone Vendor form (VendorFields),
  // so every field/option available there is available here too.
  const openVendorDialog = () => { setVendorForm(vendorEmpty()); setVendorReAccount(""); setVendorOpen(true); };
  const submitVendor = async () => {
    const error = validateVendor(vendorForm, vendorReAccount);
    if (error) { toast.error(error); return; }
    setVendorSaving(true);
    try {
      const created: ApiRow = await phase2Api.vendors.create(buildVendorPayload(vendorForm));
      toast.success("Vendor added");
      await loadVendors();
      if (created?.vendor_id) set("vendor_id", Number(created.vendor_id));
      setVendorOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add vendor");
    } finally {
      setVendorSaving(false);
    }
  };

  // ── Inline item create ──────────────────────────────────────────────────────
  const openItemDialog = (lineIdx: number) => { setItemForm(emptyItem()); setItemLineIdx(lineIdx); setItemOpen(true); };
  const submitItem = async () => {
    const error = firstError([
      [itemForm.name.trim() !== "", "Item name is required"],
      [itemForm.rate === "" || isNumeric(itemForm.rate), "Rate must be a number ≥ 0"],
    ]);
    if (error) { toast.error(error); return; }
    // Catalog names must be unique — reuse the existing item instead of a duplicate.
    const dupe = catalog.find(c => String(c.name ?? "").trim().toLowerCase() === itemForm.name.trim().toLowerCase());
    if (dupe) { toast.error(`"${String(dupe.name)}" is already in the catalog — pick it from the list instead`); return; }
    setItemSaving(true);
    try {
      const created: ApiRow = await phase2Api.purchaseItems.create({
        name: itemForm.name.trim(),
        item_type: itemForm.item_type,
        category: itemForm.category.trim() || null,
        unit: itemForm.unit || "nos",
        rate: Number(itemForm.rate || 0),
        gst_rate: Number(itemForm.gst_rate || 0),
        hsn_code: itemForm.hsn_code.trim() || null,
        specification: itemForm.specification.trim() || null,
      });
      toast.success("Item added to catalog");
      await loadCatalog();
      if (itemLineIdx != null && created?.purchase_item_id) {
        // fill the line straight from what we submitted (catalog reload is async)
        setLine(itemLineIdx, {
          purchase_item_id: Number(created.purchase_item_id),
          description: itemForm.name.trim(),
          category: itemForm.category.trim(),
          unit: itemForm.unit || "nos",
          unit_price: Number(itemForm.rate || 0),
          gst_rate: Number(itemForm.gst_rate || 0),
        });
      }
      setItemOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add item");
    } finally {
      setItemSaving(false);
    }
  };

  const submit = async () => {
    if (!form.vendor_id) { toast.error("Select a vendor"); return; }
    const validLines = lines.filter(l => l.description.trim() && l.quantity > 0);
    if (!validLines.length) { toast.error("Add at least one line item with a description"); return; }
    // No two line items may be the same item — matched by catalog id when picked,
    // else by name. Duplicates would double-count on receipt and muddle the ledger.
    const seen = new Map<string, number>();
    for (const l of validLines) {
      const key = l.purchase_item_id ? `id:${l.purchase_item_id}` : `name:${l.description.trim().toLowerCase()}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key)! > 1) {
        toast.error(`"${l.description.trim()}" is added more than once — combine it into a single line`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload: ApiRow = {
        ...form,
        items: validLines.map(l => ({
          purchase_item_id: l.purchase_item_id,
          description: l.description.trim(),
          category: l.category || null,
          quantity: Number(l.quantity),
          unit: l.unit || "nos",
          unit_price: Number(l.unit_price),
          gst_rate: Number(l.gst_rate),
        })),
      };
      if (editing) {
        await phase2Api.purchaseOrders.update(Number(id), payload);
        toast.success("Purchase order updated");
      } else {
        await phase2Api.purchaseOrders.create(payload);
        toast.success("Purchase order created");
      }
      setInitial(JSON.stringify({ form, lines }));
      navigate("/purchase/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={editing ? "Edit Purchase Order" : "New Purchase Order"}
      description="Raise a purchase order to a vendor."
      icon={<ShoppingBag className="h-6 w-6 text-primary" />}
      onBack={() => navigate("/purchase/orders")}
      footer={
        <>
          <Button variant="outline" onClick={() => navigate("/purchase/orders")} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || loading}>{saving ? "Saving…" : editing ? "Save PO" : "Create PO"}</Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* PO Details */}
          <section className="max-w-2xl space-y-4 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground">PO Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Vendor <Req /></Label>
                <RecordCombobox
                  options={vendors}
                  value={form.vendor_id || null}
                  onSelect={(v) => set("vendor_id", Number(v))}
                  getId={(v) => Number(v.vendor_id)}
                  getLabel={(v) => String(v.name ?? `Vendor #${v.vendor_id}`)}
                  getSecondary={(v) => [v.city, v.gstin].filter(Boolean).join(" · ") || undefined}
                  placeholder="Select vendor"
                  onAddNew={openVendorDialog}
                  addNewLabel="Add new vendor"
                />
                {selectedVendor && (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="font-medium text-foreground">{vendorGstin || "—"}</span>
                    {vendorGstin && (isGstin(vendorGstin)
                      ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> valid</span>
                      : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> invalid</span>)}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Order Date <Req /></Label>
                <Input type="date" value={form.order_date} onChange={e => set("order_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected Date</Label>
                <Input type="date" value={form.expected_date} onChange={e => set("expected_date", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Line Items <Req /></h3>
              <Button variant="outline" size="sm" type="button" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" /> Add row
              </Button>
            </div>

            <ScrollableX className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[220px]">Item</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-36">Category</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Qty</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Unit</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-32">Rate (₹)</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">GST %</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Total</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((l, i) => (
                    <tr key={i} className="hover:bg-muted/20 align-top">
                      <td className="px-3 py-2">
                        <RecordCombobox
                          options={catalog}
                          value={l.purchase_item_id}
                          onSelect={(v) => pickItem(i, v)}
                          getId={(it) => Number(it.purchase_item_id)}
                          getLabel={(it) => String(it.name ?? "")}
                          getSecondary={(it) => [it.category, it.rate != null ? inr(Number(it.rate)) : null].filter(Boolean).join(" · ") || undefined}
                          placeholder="Select item"
                          onAddNew={() => openItemDialog(i)}
                          addNewLabel="Add new item"
                          className="w-full"
                        />
                        {!l.purchase_item_id && (
                          <Input
                            placeholder="…or type a free description"
                            value={l.description}
                            onChange={e => setLine(i, { description: e.target.value })}
                            className="mt-1 h-8 text-sm"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input value={l.category} onChange={e => setLine(i, { category: e.target.value })} className="h-8 text-sm" placeholder="—" />
                      </td>
                      <td className="px-3 py-2">
                        {l.purchase_item_id ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeBadge(catalog.find(c => Number(c.purchase_item_id) === Number(l.purchase_item_id))?.item_type)}`}>
                            {typeLabel(catalog.find(c => Number(c.purchase_item_id) === Number(l.purchase_item_id))?.item_type)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={0} step={1} value={l.quantity} onFocus={(e) => e.currentTarget.select()} onChange={e => setLine(i, { quantity: Number(e.target.value.replace(/^0+(?=\d)/, "")) })} className="h-8 w-20 text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Select value={l.unit} onValueChange={(v) => setLine(i, { unit: v })}>
                          <SelectTrigger className="h-8 w-24 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={0} step={0.01} value={l.unit_price} onFocus={(e) => e.currentTarget.select()} onChange={e => setLine(i, { unit_price: Number(e.target.value.replace(/^0+(?=\d)/, "")) })} className="h-8 w-28 text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={0} step={1} value={l.gst_rate} onFocus={(e) => e.currentTarget.select()} onChange={e => setLine(i, { gst_rate: Number(e.target.value.replace(/^0+(?=\d)/, "")) })} className="h-8 w-20 text-sm" />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{inr(lineTotal(l))}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => requestRemoveLine(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableX>

            <div className="flex justify-end">
              <div className="rounded-lg bg-muted/40 p-4 min-w-[220px] space-y-1.5 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Estimated Total (incl. GST)</span>
                  <span className="tabular-nums">{inr(grandTotal)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="max-w-2xl space-y-3 border-t pt-6">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <Textarea rows={3} placeholder="Internal notes about this purchase order…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </section>
        </div>
      )}

      {/* ── Add new vendor (inline) ──────────────────────────────────────────── */}
      <QuickCreateDialog
        open={vendorOpen}
        onOpenChange={setVendorOpen}
        title="New Vendor"
        description="Add a vendor without leaving this purchase order."
        size="xl"
        saving={vendorSaving}
        submitLabel="Save vendor"
        onSubmit={submitVendor}
      >
        <VendorFields
          form={vendorForm}
          setForm={setVendorForm}
          reAccount={vendorReAccount}
          setReAccount={setVendorReAccount}
        />
      </QuickCreateDialog>

      {/* ── Add new item (inline) ────────────────────────────────────────────── */}
      <QuickCreateDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        title="New Item"
        description="Add a purchasable item — it's saved to the Items catalog and filled into this row."
        size="lg"
        saving={itemSaving}
        submitLabel="Save item"
        onSubmit={submitItem}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Name <Req /></Label>
            <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HDPE Woven Bag 25kg" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Type <Req /></Label>
            <Select value={itemForm.item_type} onValueChange={(v) => setItemForm(f => ({ ...f, item_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Spares &amp; Assets</SelectItem>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="pellet">Pellet</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Where received goods are stocked — Spares &amp; Assets, Raw Material, or finished Pellet.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <CategoryCombobox
              options={categoryOptions}
              value={itemForm.category}
              onChange={(v) => setItemForm(f => ({ ...f, category: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select value={itemForm.unit} onValueChange={(v) => setItemForm(f => ({ ...f, unit: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UOM_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rate (₹)</Label>
            <Input type="number" min={0} step="0.01" value={itemForm.rate} onChange={e => setItemForm(f => ({ ...f, rate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>GST %</Label>
            <Select value={itemForm.gst_rate} onValueChange={(v) => setItemForm(f => ({ ...f, gst_rate: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>HSN / SAC Code</Label>
            <Input value={itemForm.hsn_code} onChange={e => setItemForm(f => ({ ...f, hsn_code: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Specification</Label>
            <Textarea rows={2} value={itemForm.specification} onChange={e => setItemForm(f => ({ ...f, specification: e.target.value }))} placeholder="Size, grade, material, brand…" />
          </div>
        </div>
      </QuickCreateDialog>

      {/* ── Confirm removing a line that has data ────────────────────────────── */}
      <ConfirmDeleteDialog
        open={delIdx !== null}
        onOpenChange={(v) => { if (!v) setDelIdx(null); }}
        onConfirm={() => { if (delIdx !== null) rmLine(delIdx); setDelIdx(null); }}
        title="Remove this line item?"
        description={
          delIdx !== null && lines[delIdx]
            ? <>“{lines[delIdx].description?.trim() || "This item"}” will be removed from the purchase order.</>
            : "This line will be removed from the purchase order."
        }
        confirmLabel="Remove line"
      />
    </FormPage>
  );
}
