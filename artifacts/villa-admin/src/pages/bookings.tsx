import { useState, useEffect, useMemo, useRef } from "react";
import {
  getReservations,
  deleteReservation,
  updateReservation,
  getAdminName,
  isSuperAdmin,
  type Reservation,
} from "@/services/api";
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, exportToXLSX, exportToPDF } from "@/utils/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ModalBooking, { detectBookingCategory, type BookingCategory } from "@/components/modal-booking";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileDown,
  Loader2,
  RefreshCw,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  property: "bg-blue-500/20 text-blue-400",
  trips:    "bg-violet-500/20 text-violet-400",
  catering: "bg-orange-500/20 text-orange-400",
  outbound: "bg-emerald-500/20 text-emerald-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  property: "Properti",
  trips:    "Trips",
  catering: "Catering",
  outbound: "Outbound",
};

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

export default function BookingsPage() {
  const { toast } = useToast();
  const adminName = getAdminName();
  const superAdmin = isSuperAdmin();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [filterCategory, setFilterCategory] = useState<BookingCategory | "all">("all");
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── Multi-select ── */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── Auto-lunas guard: only run once per page session ── */
  const autoLunasRan = useRef(false);

  async function autoMarkExpiredAsLunas(data: Reservation[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expired = data.filter((r) => {
      if (r.status !== "pending") return false;
      const endDateStr = r.checkout || r.checkin;
      if (!endDateStr) return false;
      const end = new Date(endDateStr);
      if (isNaN(end.getTime())) return false;
      end.setHours(0, 0, 0, 0);
      return end < today;
    });
    if (expired.length === 0) return false;
    let updated = 0;
    for (const r of expired) {
      try {
        const res = await updateReservation({ ...r, status: "lunas" });
        if (res.ok) updated++;
      } catch {
        /* ignore individual failures */
      }
    }
    if (updated > 0) {
      toast({
        title: "Auto Lunas",
        description: `${updated} booking pending yang sudah lewat tanggal otomatis diubah ke Lunas`,
      });
    }
    return updated > 0;
  }

  async function load(opts: { autoLunas?: boolean } = {}) {
    setLoading(true);
    try {
      const data = await getReservations();
      if (opts.autoLunas && !autoLunasRan.current) {
        autoLunasRan.current = true;
        const didUpdate = await autoMarkExpiredAsLunas(data);
        if (didUpdate) {
          const fresh = await getReservations();
          setReservations(fresh);
          return;
        }
      }
      setReservations(data);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load({ autoLunas: true }); }, []);

  const years = useMemo(() => {
    const s = new Set(reservations.map((r) => r.checkin?.slice(0, 4)).filter(Boolean));
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [reservations]);

  const adminNames = useMemo(() => {
    const s = new Set(reservations.map((r) => r.admin_name).filter(Boolean) as string[]);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [reservations]);

  const filtered = useMemo(() => {
    const list = reservations.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.guest_name.toLowerCase().includes(q) ||
        r.guest_phone.includes(q) ||
        r.property_name.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q);
      const month = r.checkin?.slice(5, 7);
      const year = r.checkin?.slice(0, 4);
      const matchMonth = filterMonth === "all" || month === filterMonth;
      const matchYear = filterYear === "all" || year === filterYear;
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchFilterAdmin = !superAdmin || filterAdmin === "all" || r.admin_name?.toLowerCase() === filterAdmin.toLowerCase();
      const matchCategory = filterCategory === "all" || detectBookingCategory(r.property_id) === filterCategory;
      return matchSearch && matchMonth && matchYear && matchStatus && matchFilterAdmin && matchCategory;
    });
    /* Auto sort by checkin tanggal ascending (1, 2, 3 ...), checkout sebagai tie-breaker */
    return list.sort((a, b) => {
      const ci = (a.checkin || "").localeCompare(b.checkin || "");
      if (ci !== 0) return ci;
      return (a.checkout || "").localeCompare(b.checkout || "");
    });
  }, [reservations, search, filterMonth, filterYear, filterStatus, filterAdmin, filterCategory, superAdmin]);

  function openCreate() {
    setSelected(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openView(r: Reservation) {
    if (selectMode) {
      toggleSelect(r.id);
      return;
    }
    setSelected(r);
    setModalMode("view");
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteReservation(id);
      if (!res.ok) throw new Error("Gagal hapus");
      toast({ title: "Dihapus", description: "Reservasi berhasil dihapus" });
      setModalOpen(false);
      load();
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    }
    setDeleteId(null);
  }

  /* ── Multi-select helpers ── */
  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const res = await deleteReservation(id);
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    setSelectMode(false);
    if (failed === 0) {
      toast({ title: "Berhasil dihapus", description: `${selectedIds.size} reservasi dihapus` });
    } else {
      toast({ title: "Sebagian gagal", description: `${failed} reservasi gagal dihapus`, variant: "destructive" });
    }
    load();
  }

  async function handleExportXLSX() {
    await exportToXLSX(filtered, adminName, filterMonth, filterYear);
  }

  function handleExportPDF() {
    exportToPDF(filtered, adminName, filterMonth, filterYear);
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bookings</h1>
          <p className="text-slate-400 text-sm">
            {filtered.length} reservasi
            {!superAdmin && <span className="ml-1 text-blue-400/70">· {adminName}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {!selectMode ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => load()}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 h-8 px-2.5"
                data-testid="button-refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleSelectMode}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 px-3 text-xs"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                Pilih
              </Button>
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-3"
                data-testid="button-tambah"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSelectAll}
                className="text-slate-300 hover:text-white h-8 px-3 text-xs border border-slate-600 hover:bg-slate-700"
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> : <Square className="w-3.5 h-3.5 mr-1.5" />}
                {allSelected ? "Batal semua" : "Pilih semua"}
              </Button>
              {someSelected && (
                <Button
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="bg-red-600 hover:bg-red-500 text-white h-8 px-3 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Hapus ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSelectMode}
                className="text-slate-400 hover:text-white h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-0 rounded-lg overflow-hidden border border-slate-700 self-start">
        {([
          { key: "all",      label: "Semua" },
          { key: "property", label: "Properti" },
          { key: "trips",    label: "Trips" },
          { key: "catering", label: "Catering" },
          { key: "outbound", label: "Outbound" },
        ] as { key: BookingCategory | "all"; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === key
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tamu, properti..."
            className="bg-slate-800 border-slate-600 text-white text-sm h-8 pl-8"
            data-testid="input-search"
          />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-32">
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua bulan</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1).padStart(2, "0")} className="text-white">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-24">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y} className="text-white">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-28">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">Semua</SelectItem>
            <SelectItem value="pending" className="text-white">Pending</SelectItem>
            <SelectItem value="lunas" className="text-white">Lunas</SelectItem>
            <SelectItem value="cancel" className="text-white">Cancel</SelectItem>
          </SelectContent>
        </Select>
        {superAdmin && (
          <Select value={filterAdmin} onValueChange={setFilterAdmin}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-32">
              <SelectValue placeholder="Admin" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">Semua admin</SelectItem>
              {adminNames.map((name) => (
                <SelectItem key={name} value={name} className="text-white">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportXLSX}
          className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-500/10 h-8 px-3 text-xs"
          data-testid="button-export-xlsx"
          title="Export ke Excel (.xlsx) dengan sheet per properti"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          XLSX
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          className="border-red-600/50 text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs"
          data-testid="button-export-pdf"
          title="Export ke PDF / Print"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" />
          PDF
        </Button>
      </div>

      {/* Loading / empty */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          Tidak ada data reservasi
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.map((r) => {
              const isChecked = selectedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  data-testid={`row-booking-${r.id}`}
                  onClick={() => openView(r)}
                  className={`bg-slate-800/60 border rounded-xl px-4 py-3 cursor-pointer active:bg-slate-700/40 transition-colors ${
                    isChecked ? "border-blue-500/60 bg-blue-500/10" : "border-slate-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectMode && (
                        <div className="flex-shrink-0">
                          {isChecked
                            ? <CheckSquare className="w-4 h-4 text-blue-400" />
                            : <Square className="w-4 h-4 text-slate-500" />
                          }
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{r.guest_name}</p>
                        <p className="text-slate-500 text-xs">{r.guest_phone}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5 shrink-0`}>
                      {getStatusLabel(r.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[detectBookingCategory(r.property_id)]}`}>
                      {CATEGORY_LABELS[detectBookingCategory(r.property_id)]}
                    </span>
                    <p className="text-slate-300 text-xs font-medium truncate">{r.property_name}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDate(r.checkin)} → {formatDate(r.checkout)}</span>
                    <span className="text-slate-300 font-medium">{formatRupiah(r.total_price)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700 bg-slate-800/80">
                    {selectMode && (
                      <th className="px-4 py-3 w-10">
                        <button onClick={toggleSelectAll}>
                          {allSelected
                            ? <CheckSquare className="w-4 h-4 text-blue-400" />
                            : <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                          }
                        </button>
                      </th>
                    )}
                    <th className="text-left px-4 py-3 font-medium">Tamu</th>
                    <th className="text-left px-4 py-3 font-medium">Properti</th>
                    <th className="text-left px-4 py-3 font-medium">Checkin</th>
                    <th className="text-left px-4 py-3 font-medium">Checkout</th>
                    <th className="text-left px-4 py-3 font-medium">Total</th>
                    <th className="text-left px-4 py-3 font-medium">DP</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const isChecked = selectedIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        data-testid={`row-booking-${r.id}`}
                        className={`border-b border-slate-700/50 cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-blue-500/10 hover:bg-blue-500/20"
                            : "hover:bg-slate-700/20"
                        }`}
                        onClick={() => openView(r)}
                      >
                        {selectMode && (
                          <td className="px-4 py-3">
                            {isChecked
                              ? <CheckSquare className="w-4 h-4 text-blue-400" />
                              : <Square className="w-4 h-4 text-slate-500" />
                            }
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{r.guest_name}</p>
                          <p className="text-slate-500 text-xs">{r.guest_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[detectBookingCategory(r.property_id)]}`}>
                              {CATEGORY_LABELS[detectBookingCategory(r.property_id)]}
                            </span>
                            <p className="text-slate-300">{r.property_name}</p>
                          </div>
                          <p className="text-slate-500 text-xs">{r.address}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(r.checkin)}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(r.checkout)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatRupiah(r.total_price)}</td>
                        <td className="px-4 py-3 text-slate-400">{formatRupiah(r.dp)}</td>
                        <td className="px-4 py-3">
                          <Badge className={`${getStatusColor(r.status)} border text-xs px-2 py-0.5`}>
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {!selectMode && <ChevronRight className="w-4 h-4 text-slate-600" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <ModalBooking
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        reservation={selected}
        mode={modalMode}
        onSuccess={load}
        onDelete={(id) => { setDeleteId(id); }}
      />

      {/* Single delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Reservasi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tindakan ini tidak dapat dibatalkan. Reservasi akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Hapus {selectedIds.size} Reservasi?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Semua reservasi yang dipilih akan dihapus permanen dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Hapus ${selectedIds.size} Reservasi`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
