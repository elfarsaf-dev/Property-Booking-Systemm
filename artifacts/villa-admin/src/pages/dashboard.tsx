import { useState, useEffect, useMemo } from "react";
import { getReservations, getAdminName, isSuperAdmin, type Reservation } from "@/services/api";
import { formatRupiah, formatDate, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  CalendarCheck, TrendingUp, Wallet, XCircle, Loader2,
  Users, ChevronDown, ChevronUp, ShieldCheck, SlidersHorizontal,
} from "lucide-react";

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const PIE_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4",
  "#ec4899","#f97316","#84cc16","#a855f7","#14b8a6","#eab308",
  "#64748b","#dc2626","#7c3aed","#059669",
];

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof CalendarCheck; label: string; value: string; color: string;
}) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminGroup({ adminName, reservations }: { adminName: string; reservations: Reservation[] }) {
  const [open, setOpen] = useState(false);
  const total      = reservations.length;
  const totalOmset = reservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const totalDp    = reservations.reduce((s, r) => s + r.dp, 0);
  const dpHangus   = reservations.filter((r) => r.status === "cancel").reduce((s, r) => s + r.dp, 0);
  const recent = [...reservations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold uppercase">{adminName.slice(0, 2)}</span>
            </div>
            <div>
              <CardTitle className="text-white text-sm font-semibold capitalize">{adminName}</CardTitle>
              <p className="text-slate-500 text-xs">{total} booking · {formatRupiah(totalOmset)} omset</p>
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={CalendarCheck} label="Booking"   value={String(total)}         color="bg-blue-500/20 text-blue-400" />
            <StatCard icon={TrendingUp}   label="Omset"     value={formatRupiah(totalOmset)} color="bg-emerald-500/20 text-emerald-400" />
            <StatCard icon={Wallet}       label="DP Masuk"  value={formatRupiah(totalDp)}  color="bg-amber-500/20 text-amber-400" />
            <StatCard icon={XCircle}      label="DP Hangus" value={formatRupiah(dpHangus)} color="bg-red-500/20 text-red-400" />
          </div>
          {recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left pb-2 font-medium">Tamu</th>
                    <th className="text-left pb-2 font-medium">Properti</th>
                    <th className="text-left pb-2 font-medium">Checkin</th>
                    <th className="text-left pb-2 font-medium">Total</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-slate-700/40">
                      <td className="py-2 text-white font-medium">{r.guest_name}</td>
                      <td className="py-2 text-slate-300">{r.property_name}</td>
                      <td className="py-2 text-slate-400">{formatDate(r.checkin)}</td>
                      <td className="py-2 text-slate-300">{formatRupiah(r.total_price)}</td>
                      <td className="py-2">
                        <Badge className={`${getStatusColor(r.status)} border text-xs px-1.5 py-0`}>
                          {getStatusLabel(r.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear]   = useState("all");
  const superAdmin = isSuperAdmin();
  const adminName  = getAdminName();

  useEffect(() => {
    getReservations()
      .then(setReservations)
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Base: server already filters by admin_id ── */
  const myReservations = useMemo(() => reservations, [reservations]);

  /* ── Available years from unfiltered data ── */
  const allYears = useMemo(() => {
    const yrs = new Set(
      myReservations
        .map((r) => r.checkin ? new Date(r.checkin).getFullYear().toString() : null)
        .filter(Boolean) as string[]
    );
    return [...yrs].sort().reverse();
  }, [myReservations]);

  /* ── GLOBAL FILTER — everything below uses this ── */
  const filtered = useMemo(() => {
    return myReservations.filter((r) => {
      const d = r.checkin ? new Date(r.checkin) : null;
      if (!d) return true;
      if (filterMonth !== "all" && (d.getMonth() + 1).toString() !== filterMonth) return false;
      if (filterYear  !== "all" && d.getFullYear().toString()      !== filterYear)  return false;
      return true;
    });
  }, [myReservations, filterMonth, filterYear]);

  const periodLabel = useMemo(() => {
    if (filterMonth !== "all" && filterYear !== "all")
      return `${MONTHS_ID[parseInt(filterMonth) - 1]} ${filterYear}`;
    if (filterMonth !== "all") return MONTHS_ID[parseInt(filterMonth) - 1];
    if (filterYear  !== "all") return `Tahun ${filterYear}`;
    return "Semua Periode";
  }, [filterMonth, filterYear]);

  /* ── Stats from filtered ── */
  const total      = filtered.length;
  const totalOmset = filtered.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const totalDp    = filtered.reduce((s, r) => s + r.dp, 0);
  const dpHangus   = filtered.filter((r) => r.status === "cancel").reduce((s, r) => s + r.dp, 0);

  /* ── Per-admin groups from filtered ── */
  const adminGroups = useMemo(() => {
    if (!superAdmin) return {};
    const groups: Record<string, Reservation[]> = {};
    for (const r of filtered) {
      const key = r.admin_name || "(tanpa admin)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [filtered, superAdmin]);

  /* ── Recent from filtered ── */
  const recent = useMemo(() =>
    [...filtered]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
    [filtered]
  );

  /* ── Chart data from filtered ── */
  const lineData = useMemo(() => {
    const perHari: Record<string, { omset: number; pending: number; cancel: number }> = {};
    for (const r of filtered) {
      const date = r.checkin?.slice(0, 10) || "";
      if (!date) continue;
      if (!perHari[date]) perHari[date] = { omset: 0, pending: 0, cancel: 0 };
      if (r.status === "lunas")   perHari[date].omset   += r.total_price ?? 0;
      if (r.status === "pending") perHari[date].pending += r.total_price ?? 0;
      if (r.status === "cancel")  perHari[date].cancel  += r.total_price ?? 0;
    }
    return Object.entries(perHari)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ tanggal: date.slice(5), ...v }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      const key = r.property_name?.trim() || "Tanpa Properti";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const PIE_MAX = 3;
  const pieDisplayData = useMemo(() => {
    if (pieData.length <= PIE_MAX) return pieData;
    const top = pieData.slice(0, PIE_MAX);
    const rest = pieData.slice(PIE_MAX).reduce((s, d) => s + d.value, 0);
    return [...top, { name: "Lainnya", value: rest }];
  }, [pieData]);

  /* ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-16 text-red-400"><p>{error}</p></div>;
  }

  return (
    <div className="space-y-5">

      {/* ── Header + Global Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            {superAdmin && <ShieldCheck className="w-5 h-5 text-amber-400" />}
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {superAdmin
              ? `Superadmin · ${total} booking dari ${Object.keys(adminGroups).length} admin`
              : `${adminName} · ${total} booking`}
            {" · "}
            <span className="text-blue-400 font-medium">{periodLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-8 w-36 bg-slate-800 border-slate-600 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">Semua Bulan</SelectItem>
              {MONTHS_ID.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)} className="text-white text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-8 w-28 bg-slate-800 border-slate-600 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">Semua Tahun</SelectItem>
              {allYears.map((y) => (
                <SelectItem key={y} value={y} className="text-white text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Global stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label={superAdmin ? "Total Semua" : "Total Booking"} value={String(total)}          color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={TrendingUp}   label="Total Omset"  value={formatRupiah(totalOmset)} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={Wallet}       label="DP Masuk"     value={formatRupiah(totalDp)}    color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={XCircle}      label="DP Hangus"    value={formatRupiah(dpHangus)}   color="bg-red-500/20 text-red-400" />
      </div>

      {/* ── Superadmin: per-admin groups ── */}
      {superAdmin && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-semibold text-sm">
              Data Per Admin
              {filterMonth !== "all" || filterYear !== "all"
                ? <span className="text-slate-500 font-normal ml-1">· {periodLabel}</span>
                : null}
            </h2>
          </div>
          {Object.entries(adminGroups)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([name, data]) => (
              <AdminGroup key={name} adminName={name} reservations={data} />
            ))}
          {Object.keys(adminGroups).length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">
              Tidak ada data pada periode ini
            </p>
          )}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">
              Tren Booking — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lineData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada data</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-2 px-1">
                  {[
                    { key: "omset",   label: "Omset",   color: "#22c55e" },
                    { key: "pending", label: "Pending", color: "#f97316" },
                    { key: "cancel",  label: "Cancel",  color: "#ef4444" },
                  ].map(({ key, label, color }) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span style={{ background: color }} className="inline-block w-3 h-0.5 rounded-full" />
                      {label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="tanggal" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(v: number, name: string) => {
                        const label = name === "omset" ? "Omset" : name === "pending" ? "Pending" : "Cancel";
                        return [formatRupiah(v), label];
                      }}
                    />
                    <Line type="monotone" dataKey="omset"   stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="cancel"  stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-semibold">Booking per Properti</CardTitle>
          </CardHeader>
          <CardContent>
            {pieDisplayData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieDisplayData}
                      cx="50%" cy="50%"
                      innerRadius={42} outerRadius={68}
                      dataKey="value" paddingAngle={2}
                    >
                      {pieDisplayData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [`${v} booking`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent bookings (non-superadmin or all) ── */}
      {!superAdmin && (
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">
              Booking Terbaru — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada booking</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left pb-2 font-medium">Tamu</th>
                      <th className="text-left pb-2 font-medium">Properti</th>
                      <th className="text-left pb-2 font-medium">Checkin</th>
                      <th className="text-left pb-2 font-medium">Total</th>
                      <th className="text-left pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="py-2.5 text-white font-medium">{r.guest_name}</td>
                        <td className="py-2.5 text-slate-300">{r.property_name}</td>
                        <td className="py-2.5 text-slate-400">{formatDate(r.checkin)}</td>
                        <td className="py-2.5 text-slate-300">{formatRupiah(r.total_price)}</td>
                        <td className="py-2.5">
                          <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5`}>
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
