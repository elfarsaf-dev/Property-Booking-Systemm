import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { logout, getAdminName, isSuperAdmin, getReservations } from "@/services/api";
import { useUnreadCount } from "@/hooks/use-unread";
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  MessageCircle,
  User,
  LogOut,
} from "lucide-react";

const NAV_BASE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/katalog", label: "Katalog", icon: Building2 },
  { href: "/chat", label: "Chat", icon: MessageCircle, chat: true },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [contacts, setContacts] = useState<string[]>([]);
  const adminName = getAdminName();
  const superAdmin = isSuperAdmin();
  const unread = useUnreadCount(contacts);

  useEffect(() => {
    const me = adminName.toLowerCase();
    getReservations()
      .then((data) => {
        const names = [...new Set(data.map((r) => r.admin_name).filter(Boolean))]
          .filter((n) => n.toLowerCase() !== me)
          .sort();
        setContacts(names);
      })
      .catch(() => {});
  }, [adminName]);

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 border-r border-slate-800 fixed h-full z-20">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/50 shrink-0">
            <img src="https://raw.githubusercontent.com/elfarsaf-dev/lawuscape/main/uploads/1775130099890-12129.jpg"
              alt="E-Rekap" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">E-Rekap</p>
            <p className={`text-xs capitalize ${superAdmin ? "text-amber-400 font-medium" : "text-slate-400"}`}>
              {adminName} {superAdmin && "✦"}
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_BASE.map(({ href, label, icon: Icon, chat }) => {
            const active = location === href || location.startsWith(href);
            const showBadge = chat && unread > 0 && !active;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  active
                    ? superAdmin ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-slate-900" />
                  )}
                </div>
                {label}
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded overflow-hidden border border-slate-700/50 shrink-0">
            <img src="https://raw.githubusercontent.com/elfarsaf-dev/lawuscape/main/uploads/1775130099890-12129.jpg"
              alt="E-Rekap" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold text-sm">E-Rekap</span>
          {superAdmin && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-400/30 rounded-full px-2 py-0.5 font-medium">
              Super
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile bottom navbar — glassmorphism */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(148, 163, 184, 0.10)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {NAV_BASE.map(({ href, label, icon: Icon, chat }) => {
          const active = location === href || location.startsWith(href);
          const showBadge = chat && unread > 0 && !active;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]"
            >
              <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                active
                  ? superAdmin
                    ? "bg-amber-500/25 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                    : "bg-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                  : "bg-transparent"
              }`}>
                <Icon className={`w-5 h-5 transition-colors ${
                  active
                    ? superAdmin ? "text-amber-400" : "text-blue-400"
                    : "text-slate-500"
                }`} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-1 ring-slate-950 flex items-center justify-center">
                    {unread <= 9 && <span className="text-[7px] text-white font-bold leading-none">{unread}</span>}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                active
                  ? superAdmin ? "text-amber-400" : "text-blue-400"
                  : "text-slate-500"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
