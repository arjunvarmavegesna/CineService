"use client";

import { useEffect, useState, useCallback } from "react";

interface Theater {
  id: string; name: string; city: string; state: string;
  address: string; phone?: string; isActive: boolean;
  _count: { screens: number; orders: number };
  settings?: { taxRate: number; packagingFee: number; deliveryEtaMin: number };
}

interface Screen {
  id: string; name: string; number: number; capacity: number; isActive: boolean;
  _count: { seats: number };
}

interface Seat {
  id: string; row: string; number: number; label: string; isActive: boolean;
  category: string; price: number;
  qrCode?: { code: string; isActive: boolean };
}

interface CategoryGroup {
  rows: string;
  seatsPerRow: string;
  category: "STANDARD" | "GOLD" | "PREMIUM" | "RECLINER";
  price: string;
}

type Tab = "theaters" | "screens" | "seats";

// Badge colors for category pills
const CATEGORY_COLORS: Record<string, string> = {
  RECLINER: "bg-blue-100 text-blue-700 border-blue-300",
  PREMIUM:  "bg-purple-100 text-purple-700 border-purple-300",
  GOLD:     "bg-amber-100 text-amber-700 border-amber-300",
  STANDARD: "bg-gray-100 text-gray-600 border-gray-300",
};

// Seat button colors in the grid view
const SEAT_COLORS: Record<string, string> = {
  RECLINER: "bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white",
  PREMIUM:  "bg-purple-100 text-purple-700 hover:bg-purple-500 hover:text-white",
  GOLD:     "bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white",
  STANDARD: "bg-gray-100 text-gray-500 hover:bg-[#E03455] hover:text-white",
};

const DEFAULT_GROUPS: CategoryGroup[] = [
  { rows: "Q", seatsPerRow: "10", category: "RECLINER", price: "299" },
  { rows: "O,P", seatsPerRow: "10", category: "PREMIUM", price: "249" },
  { rows: "G,H,I,J,K,L,M,N", seatsPerRow: "14", category: "GOLD", price: "149" },
  { rows: "A,B,C,D,E,F", seatsPerRow: "14", category: "STANDARD", price: "99" },
];

export default function TheatersPage() {
  const [tab, setTab] = useState<Tab>("theaters");
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add-theater" | "add-screen" | "bulk-seats" | null>(null);
  const [saving, setSaving] = useState(false);

  const [theaterForm, setTheaterForm] = useState({ name: "", address: "", city: "", state: "", phone: "" });
  const [screenForm, setScreenForm] = useState({ name: "", number: "", capacity: "" });
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>(DEFAULT_GROUPS);

  // Delete confirmation state: stores the id being confirmed, null = none
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadTheaters = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/theaters");
    const data = await res.json();
    setTheaters(data.data ?? []);
    setLoading(false);
  }, []);

  const loadScreens = useCallback(async (theaterId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/screens?theaterId=${theaterId}`);
    const data = await res.json();
    setScreens(data.data ?? []);
    setLoading(false);
  }, []);

  const loadSeats = useCallback(async (screenId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/seats?screenId=${screenId}`);
    const data = await res.json();
    setSeats(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTheaters(); }, [loadTheaters]);

  const selectTheater = (t: Theater) => {
    setSelectedTheater(t);
    setSelectedScreen(null);
    setTab("screens");
    loadScreens(t.id);
  };

  const selectScreen = (s: Screen) => {
    setSelectedScreen(s);
    setTab("seats");
    loadSeats(s.id);
  };

  const addTheater = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/theaters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(theaterForm),
    });
    if (res.ok) {
      setModal(null);
      loadTheaters();
      setTheaterForm({ name: "", address: "", city: "", state: "", phone: "" });
    }
    setSaving(false);
  };

  const addScreen = async () => {
    if (!selectedTheater) return;
    setSaving(true);
    const res = await fetch("/api/admin/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theaterId: selectedTheater.id,
        ...screenForm,
        number: parseInt(screenForm.number),
        capacity: parseInt(screenForm.capacity),
      }),
    });
    if (res.ok) {
      setModal(null);
      loadScreens(selectedTheater.id);
      setScreenForm({ name: "", number: "", capacity: "" });
    }
    setSaving(false);
  };

  const generateBulkSeats = async () => {
    if (!selectedScreen) return;
    setSaving(true);
    const groups = categoryGroups
      .map((g) => ({
        rows: g.rows.split(",").map((r) => r.trim().toUpperCase()).filter((r) => r.length === 1),
        seatsPerRow: parseInt(g.seatsPerRow) || 10,
        category: g.category,
        price: parseFloat(g.price) || 0,
      }))
      .filter((g) => g.rows.length > 0);

    const res = await fetch("/api/admin/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenId: selectedScreen.id, groups }),
    });
    if (res.ok) {
      setModal(null);
      loadSeats(selectedScreen.id);
      setCategoryGroups(DEFAULT_GROUPS);
    }
    setSaving(false);
  };

  const deleteTheater = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/theaters/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setConfirmDeleteId(null);
      if (selectedTheater?.id === id) {
        setSelectedTheater(null);
        setSelectedScreen(null);
        setTab("theaters");
      }
      loadTheaters();
    } else {
      setDeleteError(data.error ?? "Failed to delete theater");
    }
    setDeleting(false);
  };

  const toggleTheaterActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/theaters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) loadTheaters();
  };

  const deactivateTheater = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/theaters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      loadTheaters();
    } else {
      setDeleteError("Failed to deactivate theater");
    }
    setDeleting(false);
  };

  const deleteScreen = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/screens/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setConfirmDeleteId(null);
      if (selectedScreen?.id === id) {
        setSelectedScreen(null);
        setTab("screens");
      }
      if (selectedTheater) loadScreens(selectedTheater.id);
    } else {
      setDeleteError(data.error ?? "Failed to delete screen");
    }
    setDeleting(false);
  };

  const toggleScreenActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/screens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok && selectedTheater) loadScreens(selectedTheater.id);
  };

  const deactivateScreen = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/screens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      if (selectedTheater) loadScreens(selectedTheater.id);
    } else {
      setDeleteError("Failed to deactivate screen");
    }
    setDeleting(false);
  };

  const downloadQR = (seatId: string, seatLabel: string) => {
    const link = document.createElement("a");
    link.href = `/api/admin/qr/${seatId}`;
    link.download = `QR-${seatLabel}.png`;
    link.click();
  };

  const downloadAllQRs = () => {
    seats.forEach((seat, i) => {
      setTimeout(() => downloadQR(seat.id, seat.label), i * 200);
    });
  };

  // Group seats by row for the grid view
  const seatRows = Array.from(new Set(seats.map((s) => s.row))).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Theaters & Seats</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage theaters, screens, seats, and QR codes</p>
        </div>
        {tab === "theaters" && (
          <button
            onClick={() => setModal("add-theater")}
            className="bg-[#E03455] hover:bg-[#C82040] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Theater
          </button>
        )}
        {tab === "screens" && selectedTheater && (
          <button
            onClick={() => setModal("add-screen")}
            className="bg-[#E03455] hover:bg-[#C82040] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Screen
          </button>
        )}
        {tab === "seats" && selectedScreen && (
          <div className="flex gap-2">
            <button
              onClick={downloadAllQRs}
              className="border border-gray-200 hover:border-[#E03455]/50 text-gray-500 hover:text-[#E03455] px-3 py-2 rounded-xl text-sm transition-colors"
            >
              ↓ Download All QRs
            </button>
            <button
              onClick={() => setModal("bulk-seats")}
              className="bg-[#E03455] hover:bg-[#C82040] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              + Generate Seats
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5">
        <button
          onClick={() => { setTab("theaters"); setSelectedTheater(null); setSelectedScreen(null); setConfirmDeleteId(null); setDeleteError(""); }}
          className={`transition-colors ${tab === "theaters" ? "text-gray-900 font-medium" : "text-gray-400 hover:text-gray-900"}`}
        >
          Theaters
        </button>
        {selectedTheater && (
          <>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => { setTab("screens"); setSelectedScreen(null); setConfirmDeleteId(null); setDeleteError(""); loadScreens(selectedTheater.id); }}
              className={`transition-colors ${tab === "screens" ? "text-gray-900 font-medium" : "text-gray-400 hover:text-gray-900"}`}
            >
              {selectedTheater.name}
            </button>
          </>
        )}
        {selectedScreen && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">{selectedScreen.name}</span>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : (
        <>
          {/* ── Theaters List ── */}
          {tab === "theaters" && (
            <div className="grid gap-3">
              {theaters.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-gray-100 hover:border-[#E03455]/20 rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Clickable info area */}
                    <button
                      onClick={() => { setConfirmDeleteId(null); setDeleteError(""); selectTheater(t); }}
                      className="flex-1 text-left group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold group-hover:text-[#E03455] transition-colors">{t.name}</h3>
                        {!t.isActive && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{t.city}, {t.state}</p>
                      <p className="text-xs text-gray-400 mt-1">{t.address}</p>
                    </button>

                    {/* Stats + delete */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-[#E03455]">{t._count.screens}</p>
                          <p className="text-gray-400 text-xs">Screens</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{t._count.orders}</p>
                          <p className="text-gray-400 text-xs">Orders</p>
                        </div>
                      </div>

                      {/* Inline delete / deactivate confirm */}
                      {confirmDeleteId === t.id ? (
                        <div className="flex flex-col items-end gap-1.5">
                          {deleteError && (
                            <p className="text-xs text-red-500 max-w-[220px] text-right leading-snug">{deleteError}</p>
                          )}
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <button
                              onClick={() => { setConfirmDeleteId(null); setDeleteError(""); }}
                              className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg"
                            >
                              Cancel
                            </button>
                            {deleteError && (
                              <button
                                onClick={() => deactivateTheater(t.id)}
                                disabled={deleting}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                {deleting ? "…" : "Deactivate"}
                              </button>
                            )}
                            {!deleteError && (
                              <button
                                onClick={() => deleteTheater(t.id)}
                                disabled={deleting}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                {deleting ? "Deleting…" : "Yes, Delete"}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTheaterActive(t.id, !t.isActive); }}
                            className={`text-xs border px-2.5 py-1 rounded-lg transition-all ${t.isActive ? "text-gray-400 border-transparent hover:border-amber-200 hover:text-amber-500" : "text-green-500 border-green-200 hover:bg-green-50"}`}
                          >
                            {t.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id); setDeleteError(""); }}
                            className="text-xs text-gray-300 hover:text-red-400 border border-transparent hover:border-red-200 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {theaters.length === 0 && (
                <div className="text-center py-16 text-gray-400">No theaters yet. Add one to get started.</div>
              )}
            </div>
          )}

          {/* ── Screens List ── */}
          {tab === "screens" && (
            <div className="grid gap-3">
              {screens.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-gray-100 hover:border-[#E03455]/20 rounded-2xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Clickable area */}
                    <button
                      onClick={() => { setConfirmDeleteId(null); setDeleteError(""); selectScreen(s); }}
                      className="flex-1 text-left group"
                    >
                      <h3 className="font-semibold mb-1 group-hover:text-[#E03455] transition-colors">{s.name}</h3>
                      <p className="text-sm text-gray-500">Screen #{s.number} · {s.capacity} seats</p>
                      {!s.isActive && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mt-1 inline-block">Inactive</span>
                      )}
                    </button>

                    {/* Stats + delete */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-[#E03455]">{s._count.seats}</p>
                        <p className="text-gray-400 text-xs">Seats</p>
                      </div>

                      {confirmDeleteId === s.id ? (
                        <div className="flex flex-col items-end gap-1.5">
                          {deleteError && (
                            <p className="text-xs text-red-500 max-w-[220px] text-right leading-snug">{deleteError}</p>
                          )}
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <button
                              onClick={() => { setConfirmDeleteId(null); setDeleteError(""); }}
                              className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg"
                            >
                              Cancel
                            </button>
                            {deleteError && (
                              <button
                                onClick={() => deactivateScreen(s.id)}
                                disabled={deleting}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                {deleting ? "…" : "Deactivate"}
                              </button>
                            )}
                            {!deleteError && (
                              <button
                                onClick={() => deleteScreen(s.id)}
                                disabled={deleting}
                                className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg disabled:opacity-50"
                              >
                                {deleting ? "Deleting…" : "Yes, Delete"}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleScreenActive(s.id, !s.isActive); }}
                            className={`text-xs border px-2.5 py-1 rounded-lg transition-all ${s.isActive ? "text-gray-400 border-transparent hover:border-amber-200 hover:text-amber-500" : "text-green-500 border-green-200 hover:bg-green-50"}`}
                          >
                            {s.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); setDeleteError(""); }}
                            className="text-xs text-gray-300 hover:text-red-400 border border-transparent hover:border-red-200 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {screens.length === 0 && (
                <div className="text-center py-16 text-gray-400">No screens yet.</div>
              )}
            </div>
          )}

          {/* ── Seats Grid ── */}
          {tab === "seats" && (
            <div>
              <div className="text-center text-xs text-gray-400 tracking-widest py-2 bg-gray-50 rounded-lg mb-4">
                SCREEN ▲
              </div>

              {seatRows.map((row) => {
                const rowSeats = seats.filter((s) => s.row === row).sort((a, b) => a.number - b.number);
                return (
                  <div key={row} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 w-4 flex-shrink-0">{row}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {rowSeats.map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => downloadQR(seat.id, seat.label)}
                          title={`${seat.label} · ${seat.category} · ₹${seat.price} · Click to download QR`}
                          className={`w-8 h-7 rounded text-[10px] font-bold transition-all ${SEAT_COLORS[seat.category] ?? SEAT_COLORS.STANDARD}`}
                        >
                          {seat.number}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {seats.length === 0 && (
                <div className="text-center py-16 text-gray-400">No seats yet. Generate seats to get started.</div>
              )}

              {seats.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  {/* Category legend */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {(["RECLINER", "PREMIUM", "GOLD", "STANDARD"] as const)
                      .filter((cat) => seats.some((s) => s.category === cat))
                      .map((cat) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${SEAT_COLORS[cat].split(" ").slice(0, 2).join(" ")}`}>
                            ■
                          </div>
                          <span className="text-xs text-gray-500 capitalize">{cat.toLowerCase()}</span>
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-gray-400">Click any seat to download its QR</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Theater Modal ── */}
      {modal === "add-theater" && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Add Theater</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Theater Name *", key: "name", placeholder: "e.g. PVR Forum Mall" },
                  { label: "Address *", key: "address", placeholder: "Full address" },
                  { label: "City *", key: "city", placeholder: "City" },
                  { label: "State *", key: "state", placeholder: "State" },
                  { label: "Phone", key: "phone", placeholder: "+91 ..." },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <input
                      value={theaterForm[key as keyof typeof theaterForm]}
                      onChange={(e) => setTheaterForm({ ...theaterForm, [key]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-500 hover:text-gray-900 py-2.5 rounded-xl text-sm">Cancel</button>
                <button
                  onClick={addTheater}
                  disabled={saving || !theaterForm.name || !theaterForm.city}
                  className="flex-1 bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {saving ? "Adding..." : "Add Theater"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Screen Modal ── */}
      {modal === "add-screen" && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Add Screen</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Screen Name *", key: "name", placeholder: "e.g. Audi 1", type: "text" },
                  { label: "Screen Number *", key: "number", placeholder: "1", type: "number" },
                  { label: "Capacity *", key: "capacity", placeholder: "120", type: "number" },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <input
                      type={type}
                      value={screenForm[key as keyof typeof screenForm]}
                      onChange={(e) => setScreenForm({ ...screenForm, [key]: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm">Cancel</button>
                <button
                  onClick={addScreen}
                  disabled={saving || !screenForm.name || !screenForm.number}
                  className="flex-1 bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {saving ? "Adding..." : "Add Screen"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Generate Seats Modal ── */}
      {modal === "bulk-seats" && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg">Generate Seats</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Create seat categories for <strong className="text-gray-900">{selectedScreen?.name}</strong>.
              </p>

              <div className="space-y-4">
                {categoryGroups.map((group, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[group.category]}`}>
                        {group.category}
                      </span>
                      {categoryGroups.length > 1 && (
                        <button
                          onClick={() => setCategoryGroups((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-red-400 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">Rows (comma separated)</label>
                        <input
                          value={group.rows}
                          onChange={(e) =>
                            setCategoryGroups((prev) =>
                              prev.map((g, i) => (i === idx ? { ...g, rows: e.target.value } : g))
                            )
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
                          placeholder="A,B,C"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Seats per Row</label>
                        <input
                          type="number"
                          value={group.seatsPerRow}
                          onChange={(e) =>
                            setCategoryGroups((prev) =>
                              prev.map((g, i) => (i === idx ? { ...g, seatsPerRow: e.target.value } : g))
                            )
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={group.price}
                          onChange={(e) =>
                            setCategoryGroups((prev) =>
                              prev.map((g, i) => (i === idx ? { ...g, price: e.target.value } : g))
                            )
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">Category Type</label>
                        <select
                          value={group.category}
                          onChange={(e) =>
                            setCategoryGroups((prev) =>
                              prev.map((g, i) =>
                                i === idx ? { ...g, category: e.target.value as CategoryGroup["category"] } : g
                              )
                            )
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
                        >
                          <option value="RECLINER">Recliner</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="GOLD">Gold</option>
                          <option value="STANDARD">Standard</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {group.rows.split(",").filter((r) => r.trim().length === 1).length} rows ×{" "}
                      {group.seatsPerRow} ={" "}
                      {group.rows.split(",").filter((r) => r.trim().length === 1).length *
                        (parseInt(group.seatsPerRow) || 0)}{" "}
                      seats
                    </p>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setCategoryGroups((prev) => [
                      ...prev,
                      { rows: "", seatsPerRow: "10", category: "STANDARD", price: "99" },
                    ])
                  }
                  className="w-full border border-dashed border-gray-300 hover:border-[#E03455]/50 text-gray-400 hover:text-[#E03455] rounded-xl py-2.5 text-sm transition-colors"
                >
                  + Add Category Group
                </button>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm">Cancel</button>
                <button
                  onClick={generateBulkSeats}
                  disabled={saving}
                  className="flex-1 bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {saving ? "Generating..." : "Generate Seats"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
