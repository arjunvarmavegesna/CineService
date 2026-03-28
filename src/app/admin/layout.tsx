"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "◉" },
  { href: "/admin/orders", label: "Live Orders", icon: "⚡", live: true },
  { href: "/admin/menu", label: "Menu Items", icon: "🍽" },
  { href: "/admin/theaters", label: "Theaters & QR", icon: "🏛" },
  { href: "/admin/staff", label: "Staff & Users", icon: "👥" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-[#0A0A0C] border-r border-white/[0.06] z-40 flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/[0.06]">
          <div className="w-8 h-8 bg-[#C9A84C] rounded-lg flex items-center justify-center font-black text-black text-sm">C</div>
          <div>
            <p className="font-bold text-sm">CineServe</p>
            <p className="text-[10px] text-white/40">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${active ? "bg-[#C9A84C]/15 text-[#C9A84C] font-medium" : "text-white/50 hover:text-white hover:bg-white/5"}`}>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
                {item.live && (
                  <span className="ml-auto flex items-center gap-1 text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User at bottom */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <UserButton />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.fullName ?? user?.firstName ?? "Admin"}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.primaryEmailAddress?.emailAddress ?? ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-56">
        <header className="sticky top-0 z-20 bg-[#0D0D0F]/95 backdrop-blur border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <button className="lg:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="hidden lg:block">
            <p className="text-sm text-white/40">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-white/40 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
              View customer site →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
