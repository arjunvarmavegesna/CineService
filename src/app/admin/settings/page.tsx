"use client";

import { useEffect, useState, useCallback } from "react";

interface Theater {
  id: string; name: string; city: string;
  settings?: {
    taxRate: number; packagingFee: number;
    serviceCharge: number; deliveryEtaMin: number;
  };
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? "bg-[#E03455]" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selected, setSelected] = useState<Theater | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [packagingEnabled, setPackagingEnabled] = useState(true);
  const [form, setForm] = useState({
    taxRate: "5", packagingFee: "10", serviceCharge: "0", deliveryEtaMin: "12",
  });

  const applySettings = (s: Theater["settings"]) => {
    if (!s) return;
    setTaxEnabled(s.taxRate > 0);
    setPackagingEnabled(s.packagingFee > 0);
    setForm({
      // Keep the last non-zero value so toggling back on restores it
      taxRate: s.taxRate > 0 ? s.taxRate.toString() : form.taxRate,
      packagingFee: s.packagingFee > 0 ? s.packagingFee.toString() : form.packagingFee,
      serviceCharge: s.serviceCharge.toString(),
      deliveryEtaMin: s.deliveryEtaMin.toString(),
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/theaters");
    const data = await res.json();
    setTheaters(data.data ?? []);
    if (data.data?.length > 0) {
      setSelected(data.data[0]);
      applySettings(data.data[0].settings);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectTheater = (t: Theater) => {
    setSelected(t);
    applySettings(t.settings ?? { taxRate: 5, packagingFee: 10, serviceCharge: 0, deliveryEtaMin: 12 });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/admin/theaters/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          taxRate: taxEnabled ? parseFloat(form.taxRate) || 0 : 0,
          packagingFee: packagingEnabled ? parseFloat(form.packagingFee) || 0 : 0,
          serviceCharge: parseFloat(form.serviceCharge) || 0,
          deliveryEtaMin: parseInt(form.deliveryEtaMin) || 12,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  };

  // Live preview
  const effectiveTaxRate = taxEnabled ? parseFloat(form.taxRate || "0") : 0;
  const effectivePkgFee = packagingEnabled ? parseFloat(form.packagingFee || "0") : 0;
  const svcFee = parseFloat(form.serviceCharge || "0");
  const sampleOrder = 400;
  const tax = (sampleOrder * effectiveTaxRate) / 100;
  const previewTotal = sampleOrder + tax + effectivePkgFee + svcFee;

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
                  ${selected?.id === t.id
                    ? "bg-[#E03455]/15 border-[#E03455]/40 text-[#E03455]"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"}`}
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

              <div className="space-y-6">

                {/* GST */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">GST / Tax</p>
                      <p className="text-xs text-gray-400">Applied as a percentage of subtotal</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{taxEnabled ? "Enabled" : "Disabled"}</span>
                      <Toggle enabled={taxEnabled} onChange={setTaxEnabled} />
                    </div>
                  </div>
                  <div className={`transition-opacity ${taxEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <label className="text-xs text-gray-500 block mb-1">Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                      disabled={!taxEnabled}
                      className="w-40 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Packaging Fee */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Packaging Fee</p>
                      <p className="text-xs text-gray-400">Fixed amount added per order</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{packagingEnabled ? "Enabled" : "Disabled"}</span>
                      <Toggle enabled={packagingEnabled} onChange={setPackagingEnabled} />
                    </div>
                  </div>
                  <div className={`transition-opacity ${packagingEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                    <label className="text-xs text-gray-500 block mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.packagingFee}
                      onChange={(e) => setForm({ ...form, packagingFee: e.target.value })}
                      disabled={!packagingEnabled}
                      className="w-40 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Other settings */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Other</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Service Charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.serviceCharge}
                        onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      />
                      <p className="text-xs text-gray-400 mt-1">Set 0 to disable</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Delivery ETA (min)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.deliveryEtaMin}
                        onChange={(e) => setForm({ ...form, deliveryEtaMin: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      />
                      <p className="text-xs text-gray-400 mt-1">Shown to customer</p>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                    Preview — ₹{sampleOrder} order
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span><span>₹{sampleOrder}</span>
                    </div>
                    {effectiveTaxRate > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>GST ({effectiveTaxRate}%)</span>
                        <span>₹{tax.toFixed(0)}</span>
                      </div>
                    )}
                    {effectivePkgFee > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Packaging</span><span>₹{effectivePkgFee}</span>
                      </div>
                    )}
                    {svcFee > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Service charge</span><span>₹{svcFee}</span>
                      </div>
                    )}
                    {effectiveTaxRate === 0 && effectivePkgFee === 0 && svcFee === 0 && (
                      <div className="text-xs text-gray-400 italic">No additional fees</div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span className="text-[#E03455]">₹{previewTotal.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-400">
                    Customers will see <strong>~{form.deliveryEtaMin} minutes</strong> estimated delivery time.
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
