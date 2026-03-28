"use client";

import { useEffect, useState, useCallback } from "react";

interface Theater {
  id: string; name: string; city: string;
  settings?: {
    taxRate: number; packagingFee: number;
    serviceCharge: number; deliveryEtaMin: number;
  };
}

export default function SettingsPage() {
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selected, setSelected] = useState<Theater | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    taxRate: "5", packagingFee: "10", serviceCharge: "0", deliveryEtaMin: "12",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/theaters");
    const data = await res.json();
    setTheaters(data.data ?? []);
    if (data.data?.length > 0) {
      setSelected(data.data[0]);
      const s = data.data[0].settings;
      if (s) setForm({ taxRate: s.taxRate.toString(), packagingFee: s.packagingFee.toString(), serviceCharge: s.serviceCharge.toString(), deliveryEtaMin: s.deliveryEtaMin.toString() });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectTheater = (t: Theater) => {
    setSelected(t);
    const s = t.settings;
    setForm(s ? {
      taxRate: s.taxRate.toString(),
      packagingFee: s.packagingFee.toString(),
      serviceCharge: s.serviceCharge.toString(),
      deliveryEtaMin: s.deliveryEtaMin.toString(),
    } : { taxRate: "5", packagingFee: "10", serviceCharge: "0", deliveryEtaMin: "12" });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/admin/theaters/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          taxRate: parseFloat(form.taxRate),
          packagingFee: parseFloat(form.packagingFee),
          serviceCharge: parseFloat(form.serviceCharge),
          deliveryEtaMin: parseInt(form.deliveryEtaMin),
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  };

  const sampleOrder = 400;
  const tax = (sampleOrder * parseFloat(form.taxRate || "0")) / 100;
  const pkg = parseFloat(form.packagingFee || "0");
  const svc = parseFloat(form.serviceCharge || "0");

  if (loading) return <div className="text-gray-400 text-center py-16">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configure pricing, fees, and delivery for each theater</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Theater Selector */}
        <div className="lg:col-span-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Select Theater</p>
          <div className="space-y-2">
            {theaters.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTheater(t)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm
                  ${selected?.id === t.id ? "bg-[#E03455]/15 border-[#E03455]/40 text-[#E03455]" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"}`}
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-xs opacity-60 mt-0.5">{t.city}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">{selected.name}</h2>
                {saved && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                    ✓ Saved
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {/* Pricing */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Pricing & Fees</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "GST Tax Rate (%)", key: "taxRate", desc: "Applied on subtotal" },
                      { label: "Packaging Fee (₹)", key: "packagingFee", desc: "Per order" },
                      { label: "Service Charge (₹)", key: "serviceCharge", desc: "Optional service fee" },
                      { label: "Delivery ETA (min)", key: "deliveryEtaMin", desc: "Shown to customer" },
                    ].map(({ label, key, desc }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-500 block mb-1">{label}</label>
                        <input
                          type="number"
                          value={form[key as keyof typeof form]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                        />
                        <p className="text-xs text-gray-400 mt-1">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Preview — ₹{sampleOrder} order</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span><span>₹{sampleOrder}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>GST ({form.taxRate}%)</span><span>₹{tax.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Packaging</span><span>₹{pkg}</span>
                    </div>
                    {svc > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Service charge</span><span>₹{svc}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span className="text-[#E03455]">₹{(sampleOrder + tax + pkg + svc).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-300">
                    Customers will see <strong>~{form.deliveryEtaMin} minutes</strong> estimated delivery time after placing order.
                  </p>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">Select a theater to configure settings</div>
          )}
        </div>
      </div>
    </div>
  );
}
