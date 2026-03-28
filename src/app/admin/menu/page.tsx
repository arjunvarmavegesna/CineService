"use client";

import { useEffect, useState, useCallback } from "react";

interface Category { id: string; name: string; icon?: string; _count?: { menuItems: number } }
interface MenuItem {
  id: string; name: string; description?: string; basePrice: number;
  isVeg: boolean; status: string; isFeatured: boolean;
  category: { id: string; name: string };
  _count: { orderItems: number };
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-500/20 text-green-400",
  OUT_OF_STOCK: "bg-red-500/20 text-red-400",
  HIDDEN: "bg-gray-100 text-gray-400",
};

const emptyForm = {
  name: "", description: "", basePrice: "", categoryId: "",
  isVeg: true, status: "AVAILABLE", isFeatured: false,
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, catsRes] = await Promise.all([
      fetch("/api/admin/menu"),
      fetch("/api/admin/categories"),
    ]);
    const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()]);
    setItems(itemsData.data ?? []);
    setCategories(catsData.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setModal("add");
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      basePrice: String(item.basePrice),
      categoryId: item.category.id,
      isVeg: item.isVeg,
      status: item.status,
      isFeatured: item.isFeatured,
    });
    setModal("edit");
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, basePrice: parseFloat(form.basePrice) };
    const url = modal === "edit" ? `/api/admin/menu/${editing!.id}` : "/api/admin/menu";
    const method = modal === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { setModal(null); load(); }
    setSaving(false);
  };

  const addCategory = async () => {
    const trimmedName = catName.trim();
    if (!trimmedName || trimmedName.length < 2) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, icon: catIcon.trim() || undefined }),
      });
      if (res.ok) {
        setCatName(""); setCatIcon("");
        const catsRes = await fetch("/api/admin/categories");
        const catsData = await catsRes.json();
        setCategories(catsData.data ?? []);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.error === "string" ? data.error : "Failed to create category. Try a different name.");
      }
    } finally {
      setSavingCat(false);
    }
  };

  const toggleStatus = async (item: MenuItem) => {
    const next = item.status === "AVAILABLE" ? "OUT_OF_STOCK" : "AVAILABLE";
    await fetch(`/api/admin/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || i.category.id === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Menu Items</h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} items across {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCatModal(true)}
            className="border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 px-3 py-2 rounded-xl text-sm transition-colors"
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={openAdd}
            className="bg-[#E03455] hover:bg-[#C82040] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-[#E03455]/50 w-56"
        />
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Item</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Price</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Orders</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? "bg-green-500" : "bg-red-500"}`} />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.isFeatured && <span className="text-[10px] text-[#E03455]">⭐ Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.category.name}</td>
                  <td className="px-4 py-3 font-semibold text-[#E03455]">₹{item.basePrice}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item._count.orderItems}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleStatus(item)}
                        className="text-xs border border-gray-200 hover:border-gray-300 px-2 py-1 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {item.status === "AVAILABLE" ? "Mark OOS" : "Mark Available"}
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs border border-gray-200 hover:border-[#E03455]/50 px-2 py-1 rounded-lg text-gray-500 hover:text-[#E03455] transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">No items found</div>
          )}
        </div>
      )}

      {/* Modal */}
      {/* Category Modal */}
      {catModal && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 z-40" onClick={() => setCatModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Manage Categories</h2>
                <button onClick={() => setCatModal(false)} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>

              <div className="space-y-2 mb-5">
                {categories.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-sm">No categories yet. Add one below.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                      <span className="text-lg">{cat.icon ?? "📁"}</span>
                      <span className="text-sm font-medium flex-1">{cat.name}</span>
                      <span className="text-xs text-gray-400">{cat._count?.menuItems ?? 0} items</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Add New Category</p>
                <div className="flex gap-2">
                  <input
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="🍿"
                    maxLength={2}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-xl text-center py-2.5 text-lg focus:outline-none"
                  />
                  <input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Combos"
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                  />
                </div>
                <button
                  onClick={addCategory}
                  disabled={savingCat || catName.trim().length < 2}
                  className="w-full bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {savingCat ? "Adding..." : "Add Category"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {modal && (
        <>
          <div className="fixed inset-0 bg-gray-900/50 z-40" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">{modal === "add" ? "Add Menu Item" : "Edit Menu Item"}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-900 text-xl">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                    placeholder="e.g. Butter Popcorn"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50 resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Category *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                    >
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E03455]/50"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="HIDDEN">Hidden</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isVeg}
                      onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
                      className="accent-green-500"
                    />
                    <span className="text-sm text-gray-600">Veg</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      className="accent-[#E03455]"
                    />
                    <span className="text-sm text-gray-600">Featured</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-500 hover:text-gray-900 py-2.5 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name || !form.basePrice || !form.categoryId}
                  className="flex-1 bg-[#E03455] hover:bg-[#C82040] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? "Saving..." : modal === "add" ? "Add Item" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
