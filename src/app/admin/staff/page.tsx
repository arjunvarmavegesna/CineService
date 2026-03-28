"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string; name?: string; email?: string; phone?: string;
  role: string; isActive: boolean; createdAt: string;
  _count: { orders: number };
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/20 text-purple-400",
  THEATER_ADMIN: "bg-blue-500/20 text-blue-400",
  OPERATIONS_STAFF: "bg-cyan-500/20 text-cyan-400",
  KITCHEN_STAFF: "bg-orange-500/20 text-orange-400",
  CUSTOMER: "bg-gray-100 text-gray-400",
};

const ROLES = ["SUPER_ADMIN", "THEATER_ADMIN", "OPERATIONS_STAFF", "KITCHEN_STAFF", "CUSTOMER"];

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (userId: string, role: string) => {
    setChangingRole(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role }),
    });
    load();
    setChangingRole(null);
  };

  const toggleActive = async (user: User) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    load();
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const staffUsers = filtered.filter((u) => u.role !== "CUSTOMER");
  const customerUsers = filtered.filter((u) => u.role === "CUSTOMER");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Users & Staff</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {users.filter((u) => u.role !== "CUSTOMER").length} staff · {users.filter((u) => u.role === "CUSTOMER").length} customers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-[#E03455]/50 w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#E03455]/50"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Staff section */}
          {staffUsers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Staff Members</h2>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Change Role</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {staffUsers.map((user, i) => (
                      <tr key={user.id} className={`border-b border-gray-100 ${i === staffUsers.length - 1 ? "border-b-0" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                              {user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium">{user.name ?? "—"}</p>
                              <p className="text-xs text-gray-400">{user.email ?? user.phone ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                            {user.role.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(e) => updateRole(user.id, e.target.value)}
                            disabled={changingRole === user.id}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#E03455]/50 disabled:opacity-50"
                          >
                            {ROLES.filter((r) => r !== "CUSTOMER").map((r) => (
                              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(user)}
                            className="text-xs border border-gray-200 hover:border-gray-300 px-2 py-1 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                          >
{user.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customers section */}
          {customerUsers.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Customers ({customerUsers.length})</h2>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Orders</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Joined</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {customerUsers.slice(0, 20).map((user, i) => (
                      <tr key={user.id} className={`border-b border-gray-100 ${i === Math.min(20, customerUsers.length) - 1 ? "border-b-0" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{user.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{user.email ?? user.phone ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{user._count.orders}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => updateRole(user.id, "THEATER_ADMIN")}
                            className="text-xs border border-gray-200 hover:border-[#E03455]/50 px-2 py-1 rounded-lg text-gray-500 hover:text-[#E03455] transition-colors"
                          >
                            Make Staff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customerUsers.length > 20 && (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center border-t border-gray-100">
                    Showing 20 of {customerUsers.length} customers
                  </div>
                )}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}