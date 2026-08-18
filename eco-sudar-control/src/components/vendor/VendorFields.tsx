import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Req } from "@/components/Req";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApiRow } from "@/lib/api/phase2";

/**
 * The single source of truth for what a vendor record looks like on a form.
 *
 * Both the full-page Vendor form and the inline "add vendor" popup render
 * {@link VendorFields}, so a field added here shows up in both places and the
 * two can never drift apart.
 */

export const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "M/s."];
export const VENDOR_PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];

export const vendorEmpty = () => ({
  salutation: "", first_name: "", last_name: "", company_name: "",
  name: "", email: "", phone: "", mobile: "",
  gstin: "", pan: "", msme_registered: false, opening_balance: "", payment_terms: "",
  billing_attention: "", billing_country: "", address: "", billing_street2: "",
  city: "", state: "", pincode: "", billing_phone: "", billing_fax: "",
  shipping_attention: "", shipping_country: "", shipping_street1: "", shipping_street2: "",
  shipping_city: "", shipping_state: "", shipping_pincode: "", shipping_phone: "", shipping_fax: "",
  bank_account_holder: "", bank_name: "", bank_account_number: "", bank_ifsc: "",
  notes: "",
});

export type VendorFormState = ReturnType<typeof vendorEmpty>;

/** Map an API vendor row onto the form shape (fills every key, coercing types). */
export function vendorFromRow(v: ApiRow): VendorFormState {
  const next = vendorEmpty();
  (Object.keys(next) as (keyof VendorFormState)[]).forEach((k) => {
    if (k === "msme_registered") next[k] = !!v[k] as VendorFormState[typeof k];
    else if (k === "opening_balance") next[k] = (v[k] != null ? String(v[k]) : "") as VendorFormState[typeof k];
    else next[k] = (v[k] ?? "") as VendorFormState[typeof k];
  });
  return next;
}

/** Returns an error message string, or null when the form is valid. */
export function validateVendor(form: VendorFormState, reAccount: string): string | null {
  if (!form.name.trim()) return "Display Name is required";
  if (form.bank_account_number && form.bank_account_number !== reAccount) {
    return "Account number and re-entered account number do not match";
  }
  return null;
}

/** Build the API payload from the form (keeps the legacy contact_name column in sync). */
export function buildVendorPayload(form: VendorFormState): ApiRow {
  return {
    ...form,
    contact_name: [form.salutation, form.first_name, form.last_name].filter(Boolean).join(" ").trim(),
    opening_balance: form.opening_balance === "" ? 0 : Number(form.opening_balance),
  };
}

/** Compact labelled field: 9rem label column on the left, control on the right. */
function Field({ label, children, req }: { label: React.ReactNode; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-start gap-3">
      <Label className="pt-2 text-sm text-muted-foreground">{label} {req && <Req />}</Label>
      <div>{children}</div>
    </div>
  );
}

type SetFn = <K extends keyof VendorFormState>(k: K, v: VendorFormState[K]) => void;

export interface VendorFieldsProps {
  form: VendorFormState;
  setForm: React.Dispatch<React.SetStateAction<VendorFormState>>;
  reAccount: string;
  setReAccount: (v: string) => void;
}

/** The complete vendor form body — identity section + tabbed details. */
export function VendorFields({ form, setForm, reAccount, setReAccount }: VendorFieldsProps) {
  const set: SetFn = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const copyBillingToShipping = () => setForm((f) => ({
    ...f,
    shipping_attention: f.billing_attention, shipping_country: f.billing_country,
    shipping_street1: f.address, shipping_street2: f.billing_street2,
    shipping_city: f.city, shipping_state: f.state, shipping_pincode: f.pincode,
    shipping_phone: f.billing_phone, shipping_fax: f.billing_fax,
  }));

  return (
    <div className="space-y-6">
      {/* Primary contact + identity */}
      <section className="max-w-3xl space-y-3">
        <Field label="Primary Contact">
          <div className="grid grid-cols-[7rem_1fr_1fr] gap-2">
            <Select value={form.salutation} onValueChange={(v) => set("salutation", v)}>
              <SelectTrigger><SelectValue placeholder="Title" /></SelectTrigger>
              <SelectContent>{SALUTATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="First Name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            <Input placeholder="Last Name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </div>
        </Field>
        <Field label="Company Name"><Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
        <Field label="Display Name" req>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="How this vendor appears everywhere" />
        </Field>
        <Field label="Email Address"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Work Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <Input placeholder="Mobile" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </div>
        </Field>
      </section>

      <Tabs defaultValue="other" className="w-full">
        <TabsList>
          <TabsTrigger value="other">Other Details</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* Other Details */}
        <TabsContent value="other" className="pt-4">
          <section className="max-w-3xl space-y-3">
            <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" /></Field>
            <Field label="PAN"><Input value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} className="max-w-[220px]" /></Field>
            <Field label="MSME Registered?">
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.msme_registered} onCheckedChange={(v) => set("msme_registered", v)} />
                <span className="text-sm text-muted-foreground">This vendor is MSME registered</span>
              </div>
            </Field>
            <Field label="Opening Balance">
              <div className="flex items-center gap-2">
                <span className="rounded-md border bg-muted px-2 py-2 text-xs text-muted-foreground">INR</span>
                <Input type="number" step="0.01" value={form.opening_balance} onChange={(e) => set("opening_balance", e.target.value)} className="max-w-[220px]" />
              </div>
            </Field>
            <Field label="Payment Terms">
              <Select value={form.payment_terms || undefined} onValueChange={(v) => set("payment_terms", v)}>
                <SelectTrigger className="max-w-[260px]"><SelectValue placeholder="Select terms" /></SelectTrigger>
                <SelectContent>
                  {VENDOR_PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </section>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address" className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AddressBlock title="Billing Address" f={form} set={set} prefix="billing" />
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Shipping Address</h3>
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-primary" onClick={copyBillingToShipping}>
                  <ArrowDown className="h-3.5 w-3.5" /> Copy billing address
                </Button>
              </div>
              <AddressBlock f={form} set={set} prefix="shipping" bare />
            </div>
          </div>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="pt-4">
          <section className="max-w-2xl space-y-3">
            <Field label="Account Holder"><Input value={form.bank_account_holder} onChange={(e) => set("bank_account_holder", e.target.value)} /></Field>
            <Field label="Bank Name"><Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
            <Field label="Account Number"><Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} /></Field>
            <Field label="Re-enter Account No.">
              <Input value={reAccount} onChange={(e) => setReAccount(e.target.value)} />
              {form.bank_account_number && reAccount && form.bank_account_number !== reAccount && (
                <p className="text-xs text-destructive mt-1">Account numbers do not match.</p>
              )}
            </Field>
            <Field label="IFSC"><Input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())} className="max-w-[220px]" /></Field>
          </section>
        </TabsContent>

        {/* Remarks */}
        <TabsContent value="remarks" className="pt-4">
          <section className="max-w-3xl">
            <Field label="Remarks"><Textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes about this vendor" /></Field>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Billing/shipping address block. `prefix` selects which set of form keys to bind. */
function AddressBlock({
  title, f, set, prefix, bare,
}: {
  title?: string;
  f: VendorFormState;
  set: SetFn;
  prefix: "billing" | "shipping";
  bare?: boolean;
}) {
  // Billing street1/city/state/pincode reuse the legacy columns.
  const k = {
    attention: `${prefix}_attention` as keyof VendorFormState,
    country: `${prefix}_country` as keyof VendorFormState,
    street1: (prefix === "billing" ? "address" : "shipping_street1") as keyof VendorFormState,
    street2: `${prefix}_street2` as keyof VendorFormState,
    city: (prefix === "billing" ? "city" : "shipping_city") as keyof VendorFormState,
    state: (prefix === "billing" ? "state" : "shipping_state") as keyof VendorFormState,
    pincode: (prefix === "billing" ? "pincode" : "shipping_pincode") as keyof VendorFormState,
    phone: `${prefix}_phone` as keyof VendorFormState,
    fax: `${prefix}_fax` as keyof VendorFormState,
  };
  const val = (key: keyof VendorFormState) => String(f[key] ?? "");
  return (
    <section className="space-y-3">
      {!bare && title && <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>}
      <Field label="Attention"><Input value={val(k.attention)} onChange={(e) => set(k.attention, e.target.value as never)} /></Field>
      <Field label="Country/Region"><Input value={val(k.country)} onChange={(e) => set(k.country, e.target.value as never)} placeholder="India" /></Field>
      <Field label="Address">
        <div className="space-y-2">
          <Input placeholder="Street 1" value={val(k.street1)} onChange={(e) => set(k.street1, e.target.value as never)} />
          <Input placeholder="Street 2" value={val(k.street2)} onChange={(e) => set(k.street2, e.target.value as never)} />
        </div>
      </Field>
      <Field label="City"><Input value={val(k.city)} onChange={(e) => set(k.city, e.target.value as never)} /></Field>
      <Field label="State"><Input value={val(k.state)} onChange={(e) => set(k.state, e.target.value as never)} /></Field>
      <Field label="Pin Code"><Input value={val(k.pincode)} onChange={(e) => set(k.pincode, e.target.value as never)} className="max-w-[160px]" /></Field>
      <Field label="Phone"><Input value={val(k.phone)} onChange={(e) => set(k.phone, e.target.value as never)} /></Field>
      <Field label="Fax"><Input value={val(k.fax)} onChange={(e) => set(k.fax, e.target.value as never)} /></Field>
    </section>
  );
}
