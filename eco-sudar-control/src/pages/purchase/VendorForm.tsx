import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { FormPage } from "@/components/FormPage";
import { Button } from "@/components/ui/button";
import { phase2Api, type ApiRow } from "@/lib/api/phase2";
import { useUnsavedChanges } from "@/components/UnsavedChangesGuard";
import {
  VendorFields, vendorEmpty, vendorFromRow, validateVendor, buildVendorPayload,
  type VendorFormState,
} from "@/components/vendor/VendorFields";

const err = (e: unknown, f: string) => (e instanceof Error ? e.message : f);

export default function VendorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [form, setForm] = useState<VendorFormState>(vendorEmpty());
  const [initial, setInitial] = useState<string>(JSON.stringify(vendorEmpty()));
  const [reAccount, setReAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    setLoading(true);
    phase2Api.vendors.get(Number(id))
      .then((v: ApiRow) => {
        const next = vendorFromRow(v);
        setForm(next);
        setInitial(JSON.stringify(next));
        setReAccount(String(v.bank_account_number ?? ""));
      })
      .catch((e) => toast.error(err(e, "Failed to load vendor")))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const dirty = useMemo(() => JSON.stringify(form) !== initial, [form, initial]);
  useUnsavedChanges(dirty && !saving, "vendor-form");

  const submit = async () => {
    const error = validateVendor(form, reAccount);
    if (error) { toast.error(error); return; }
    setSaving(true);
    try {
      const payload = buildVendorPayload(form);
      if (editing) { await phase2Api.vendors.update(Number(id), payload); toast.success("Vendor updated"); }
      else { await phase2Api.vendors.create(payload); toast.success("Vendor created"); }
      setInitial(JSON.stringify(form)); // clear dirty before navigating
      navigate("/purchase/vendors");
    } catch (e) { toast.error(err(e, "Save failed")); }
    finally { setSaving(false); }
  };

  return (
    <FormPage
      title={editing ? "Edit Vendor" : "New Vendor"}
      description="Supplier of raw materials, goods or services."
      icon={<Building2 className="h-6 w-6 text-primary" />}
      onBack={() => navigate("/purchase/vendors")}
      footer={
        <>
          <Button variant="outline" onClick={() => navigate("/purchase/vendors")} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || loading}>{saving ? "Saving…" : editing ? "Save Vendor" : "Create Vendor"}</Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading vendor…</p>
      ) : (
        <VendorFields form={form} setForm={setForm} reAccount={reAccount} setReAccount={setReAccount} />
      )}
    </FormPage>
  );
}
