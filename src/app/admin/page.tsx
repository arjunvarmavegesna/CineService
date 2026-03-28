import Link from "next/link";

const METRICS = [
  { label: "Today's Orders", value: "47", sub: "+12 from yesterday", color: "text-blue-400" },
  { label: "Active Orders", value: "8", sub: "3 need attention", color: "text-amber-400" },
  { label: "Today's Revenue", value: "₹18,420", sub: "+₹3.2k vs average", color: "text-green-400" },
  { label: "Avg Order Value", value: "₹392", sub: "↑ 8% this week", color: "text-purple-400" },
];

const RECENT_ORDERS = [
  { num: "CS-241115", seat: "C6", items: "Butter Popcorn × 2, Coke", total: "₹570", status: "PREPARING", time: "2m ago" },
  { num: "CS-241114", seat: "A3", items: "Nachos, Mango Smoothie", total: "₹460", status: "DELIVERED", time: "8m ago" },
  { num: "CS-241113", seat: "F9", items: "Movie Night Combo", total: "₹499", status: "CONFIRMED", time: "11m ago" },
  { num: "CS-241112", seat: "B12", items: "Paneer Burger, Fries, Coke", total: "₹648", status: "PENDING", time: "14m ago" },
  { num: "CS-241111", seat: "D4", items: "Solo Snack Box × 2", total: "₹698", status: "DELIVERED", time: "22m ago" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CONFIRMED: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  PREPARING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  READY: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  DELIVERED: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-[#1a1e2a] border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">{m.label}</p>
            <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
            <p className="text-xs text-white/40 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "View Live Orders", href: "/admin/orders", icon: "⚡", color: "border-amber-500/30 hover:border-amber-500/60" },
          { label: "Manage Menu", href: "/admin/menu", icon: "🍽", color: "border-white/10 hover:border-white/20" },
          { label: "Manage Theaters", href: "/admin/theaters", icon: "🏛", color: "border-white/10 hover:border-white/20" },
          { label: "View Reports", href: "/admin/reports", icon: "📊", color: "border-white/10 hover:border-white/20" },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`bg-[#1a1e2a] border ${a.color} rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-white/5`}
          >
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders table */}
      <div className="bg-[#1a1e2a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-amber-400 hover:underline">
            View live board →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="text-left px-6 py-3">Order #</th>
                <th className="text-left px-6 py-3">Seat</th>
                <th className="text-left px-6 py-3">Items</th>
                <th className="text-left px-6 py-3">Total</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {RECENT_ORDERS.map((order) => (
                <tr key={order.num} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 font-mono text-amber-400 text-xs font-bold">
                    {order.num}
                  </td>
                  <td className="px-6 py-3.5 font-black text-lg">{order.seat}</td>
                  <td className="px-6 py-3.5 text-white/60 text-xs max-w-48 truncate">
                    {order.items}
                  </td>
                  <td className="px-6 py-3.5 font-semibold">{order.total}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-white/40 text-xs">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}