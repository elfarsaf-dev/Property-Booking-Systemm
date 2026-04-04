import { useState, useEffect, useMemo } from "react";
import {
  getReservations,
  getAdminName,
  getAdminId,
  isSuperAdmin,
  getCurrentUser,
  updateCurrentUser,
  getAllUsers,
  updateUser,
  uploadImage,
  type Reservation,
  type User,
} from "@/services/api";
import { formatRupiah, getStatusColor, getStatusLabel } from "@/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarCheck, TrendingUp, Wallet, XCircle, Loader2,
  ShieldCheck, Pencil, Lock, Ban, CheckCircle, RefreshCw,
  ImagePlus, Users, Eye, EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── Helpers ─── */
const AVATAR_PALETTES = [
  "bg-blue-500/20   border-blue-400/30   text-blue-400",
  "bg-purple-500/20 border-purple-400/30 text-purple-400",
  "bg-emerald-500/20 border-emerald-400/30 text-emerald-400",
  "bg-amber-500/20  border-amber-400/30  text-amber-400",
  "bg-pink-500/20   border-pink-400/30   text-pink-400",
  "bg-cyan-500/20   border-cyan-400/30   text-cyan-400",
  "bg-rose-500/20   border-rose-400/30   text-rose-400",
  "bg-indigo-500/20 border-indigo-400/30 text-indigo-400",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

/* ─── Admin stats card (superadmin list view) ─── */
function AdminProfileCard({
  user, reservations, paletteIdx, onResetPwd, onToggleBan, onEditUser, loading,
}: {
  user: User;
  reservations: Reservation[];
  paletteIdx: number;
  onResetPwd: (u: User) => void;
  onToggleBan: (u: User) => void;
  onEditUser: (u: User) => void;
  loading: boolean;
}) {
  const pal     = AVATAR_PALETTES[paletteIdx % AVATAR_PALETTES.length];
  const total   = reservations.length;
  const omset   = reservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const cancel  = reservations.filter((r) => r.status === "cancel").length;
  const lunas   = reservations.filter((r) => r.status === "lunas").length;
  const pending = reservations.filter((r) => r.status === "pending").length;
  const isBanned = user.status === "banned";

  return (
    <Card className={`bg-slate-800/60 border-slate-700/50 ${isBanned ? "opacity-60" : ""}`}>
      <CardContent className="p-5 space-y-4">
        {/* Identity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-base font-bold flex-shrink-0 ${pal}`}>
              {user.profile_url
                ? <img src={user.profile_url} alt={user.username} className="w-full h-full object-cover rounded-2xl" />
                : initials(user.username)
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold capitalize truncate">{user.username}</p>
                {isBanned && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-[10px] px-1.5 py-0">Banned</Badge>}
              </div>
              <p className="text-slate-400 text-xs">Admin · {total} booking</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              title="Edit Profil"
              disabled={loading}
              onClick={() => onEditUser(user)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Reset Password"
              disabled={loading}
              onClick={() => onResetPwd(user)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
            >
              <Lock className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title={isBanned ? "Unban" : "Ban"}
              disabled={loading}
              onClick={() => onToggleBan(user)}
              className={`h-7 w-7 p-0 ${isBanned
                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                : "text-slate-400 hover:text-red-400 hover:bg-red-400/10"}`}
            >
              {isBanned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Stats mini */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Omset Lunas", value: formatRupiah(omset), color: "text-emerald-400" },
            { label: "Booking Cancel", value: String(cancel), color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-700/40 rounded-lg p-2.5">
              <p className="text-slate-400 text-[10px] mb-0.5">{label}</p>
              <p className={`font-bold text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="space-y-1.5">
          {([["lunas", lunas, "bg-emerald-500"], ["pending", pending, "bg-amber-500"], ["cancel", cancel, "bg-red-500"]] as const).map(
            ([s, count, bar]) => (
              <div key={s} className="flex items-center gap-2">
                <Badge className={`${getStatusColor(s)} border text-[10px] px-1.5 py-0 w-14 justify-center`}>
                  {getStatusLabel(s)}
                </Badge>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`}
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
                </div>
                <span className="text-slate-400 text-xs w-4 text-right">{count}</span>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main page ─── */
export default function ProfilePage() {
  const { toast } = useToast();
  const adminName = getAdminName();
  const superAdmin = isSuperAdmin();

  /* ── Reservations ── */
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);

  /* ── Current user ── */
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /* ── All users (superadmin) ── */
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* ── Edit profile modal ── */
  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editPwd, setEditPwd] = useState("");
  const [editShowPwd, setEditShowPwd] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editPhotoLoading, setEditPhotoLoading] = useState(false);

  /* ── Reset password modal (superadmin) ── */
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetShowPwd, setResetShowPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  /* ── Ban confirm ── */
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  /* ── Edit user (superadmin) ── */
  const [editUserTarget, setEditUserTarget] = useState<User | null>(null);
  const [editUserUsername, setEditUserUsername] = useState("");
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserPhotoLoading, setEditUserPhotoLoading] = useState(false);

  useEffect(() => {
    getReservations()
      .then(setReservations)
      .catch(() => {})
      .finally(() => setLoadingRes(false));

    getCurrentUser().then(setCurrentUser).catch(() => {});

    if (superAdmin) {
      setLoadingUsers(true);
      getAllUsers()
        .then(setAllUsers)
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }
  }, [superAdmin]);

  function refreshUsers() {
    setLoadingUsers(true);
    getAllUsers().then(setAllUsers).catch(() => {}).finally(() => setLoadingUsers(false));
  }

  /* ─── Superadmin: group reservations by admin_name ─── */
  const adminGroups = useMemo(() => {
    if (!superAdmin) return null;
    const groups: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = r.admin_name?.trim() || "(tanpa admin)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [reservations, superAdmin]);

  /* ─── Regular admin: own stats (server already filtered) ─── */
  const total   = reservations.length;
  const omset   = reservations.filter((r) => r.status === "lunas").reduce((s, r) => s + r.total_price, 0);
  const dp      = reservations.reduce((s, r) => s + r.dp, 0);
  const cancel  = reservations.filter((r) => r.status === "cancel").length;
  const byStatus = {
    lunas:   reservations.filter((r) => r.status === "lunas").length,
    pending: reservations.filter((r) => r.status === "pending").length,
    cancel,
  };
  const byProperty: Record<string, number> = {};
  for (const r of reservations) {
    byProperty[r.property_name] = (byProperty[r.property_name] || 0) + 1;
  }
  const propertyRanking = Object.entries(byProperty).sort(([, a], [, b]) => b - a).slice(0, 5);

  /* ─── Edit profile handlers ─── */
  function openEdit() {
    setEditUsername(adminName);
    setEditPwd("");
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUsername.trim()) return;
    setEditLoading(true);
    try {
      const payload: { username?: string; password?: string } = {};
      if (editUsername.trim() !== adminName) payload.username = editUsername.trim();
      if (editPwd.trim()) payload.password = editPwd.trim();
      if (!payload.username && !payload.password) {
        setEditOpen(false);
        return;
      }
      const updated = await updateCurrentUser(payload);
      localStorage.setItem("user", updated.username);
      toast({ title: "Profil diperbarui", description: "Data berhasil disimpan" });
      setEditOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Gagal update", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoLoading(true);
    try {
      const url = await uploadImage(file);
      await updateCurrentUser({ profile_url: url });
      setCurrentUser((prev) => prev ? { ...prev, profile_url: url } : prev);
      toast({ title: "Foto diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal upload foto", description: err.message, variant: "destructive" });
    } finally {
      setEditPhotoLoading(false);
    }
  }

  /* ─── Superadmin: reset password ─── */
  async function handleResetPwd(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget || !resetPwd.trim()) return;
    setResetLoading(true);
    try {
      await updateUser({ id: resetTarget.id, password: resetPwd.trim() });
      toast({ title: "Password direset", description: `Password ${resetTarget.username} berhasil diubah` });
      setResetTarget(null);
      setResetPwd("");
    } catch (err: any) {
      toast({ title: "Gagal reset", description: err.message, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  }

  /* ─── Superadmin: edit user profile ─── */
  function openEditUser(user: User) {
    setEditUserTarget(user);
    setEditUserUsername(user.username);
  }

  async function handleEditUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUserTarget || !editUserUsername.trim()) return;
    setEditUserLoading(true);
    try {
      const updated = await updateUser({ id: editUserTarget.id, username: editUserUsername.trim() });
      setAllUsers((prev) => prev.map((u) => u.id === editUserTarget.id ? { ...u, username: updated.username } : u));
      toast({ title: "Username diperbarui", description: `Username berhasil diubah menjadi "${updated.username}"` });
      setEditUserTarget(null);
    } catch (err: any) {
      toast({ title: "Gagal update", description: err.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setEditUserLoading(false);
    }
  }

  async function handleEditUserPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editUserTarget) return;
    setEditUserPhotoLoading(true);
    try {
      const url = await uploadImage(file);
      await updateUser({ id: editUserTarget.id, profile_url: url });
      setAllUsers((prev) => prev.map((u) => u.id === editUserTarget.id ? { ...u, profile_url: url } : u));
      setEditUserTarget((prev) => prev ? { ...prev, profile_url: url } : prev);
      toast({ title: "Foto profil diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal upload foto", description: err.message, variant: "destructive" });
    } finally {
      setEditUserPhotoLoading(false);
    }
  }

  /* ─── Superadmin: ban/unban ─── */
  async function handleBanConfirm() {
    if (!banTarget) return;
    setBanLoading(true);
    const newStatus = banTarget.status === "banned" ? "active" : "banned";
    try {
      await updateUser({ id: banTarget.id, status: newStatus });
      setAllUsers((prev) => prev.map((u) => u.id === banTarget.id ? { ...u, status: newStatus } : u));
      toast({ title: newStatus === "banned" ? "User dibanned" : "User diaktifkan" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBanLoading(false);
      setBanTarget(null);
    }
  }

  /* ─── SUPERADMIN VIEW ─── */
  if (superAdmin) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Manajemen User</h1>
              <p className="text-slate-400 text-sm">
                {loadingUsers ? "Memuat..." : `${allUsers.length} user terdaftar · ${reservations.length} total booking`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshUsers}
            disabled={loadingUsers}
            className="text-slate-400 hover:text-white h-8 w-8 p-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : allUsers.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-500 gap-2">
            <Users className="w-8 h-8" />
            <p className="text-sm">Belum ada data user</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allUsers
              .filter((u) => u.username?.toLowerCase() !== "superadmin")
              .map((u, i) => (
                <AdminProfileCard
                  key={u.id}
                  user={u}
                  reservations={adminGroups?.[u.username] ?? []}
                  paletteIdx={i}
                  onResetPwd={setResetTarget}
                  onToggleBan={setBanTarget}
                  onEditUser={openEditUser}
                  loading={banLoading}
                />
              ))}
          </div>
        )}

        {/* Edit User Modal */}
        <Dialog open={!!editUserTarget} onOpenChange={(o) => { if (!o) setEditUserTarget(null); }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                Edit Profil — {editUserTarget?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3">
                <label className="cursor-pointer group relative">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-bold overflow-hidden">
                    {editUserPhotoLoading
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : editUserTarget?.profile_url
                        ? <img src={editUserTarget.profile_url} alt={editUserTarget.username} className="w-full h-full object-cover" />
                        : initials(editUserTarget?.username || "")
                    }
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImagePlus className="w-3.5 h-3.5 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleEditUserPhotoChange} disabled={editUserPhotoLoading} />
                </label>
                <p className="text-slate-400 text-xs">Klik foto untuk mengganti</p>
              </div>
              {/* Username form */}
              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Username</Label>
                  <Input
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    placeholder="Username baru"
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setEditUserTarget(null)}
                    className="text-slate-400 hover:text-white">Batal</Button>
                  <Button
                    type="submit"
                    disabled={editUserLoading || !editUserUsername.trim() || editUserUsername.trim() === editUserTarget?.username}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {editUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetPwd(""); } }}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Reset Password — {resetTarget?.username}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleResetPwd} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Password Baru</Label>
                <div className="relative">
                  <Input
                    type={resetShowPwd ? "text" : "password"}
                    value={resetPwd}
                    onChange={(e) => setResetPwd(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setResetShowPwd(!resetShowPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {resetShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setResetTarget(null); setResetPwd(""); }}
                  className="text-slate-400 hover:text-white">Batal</Button>
                <Button type="submit" disabled={resetLoading || !resetPwd.trim()}
                  className="bg-amber-600 hover:bg-amber-500 text-white">
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Ban Confirm */}
        <AlertDialog open={!!banTarget} onOpenChange={(o) => { if (!o) setBanTarget(null); }}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                {banTarget?.status === "banned" ? "Aktifkan" : "Ban"} User?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                {banTarget?.status === "banned"
                  ? `User "${banTarget?.username}" akan dapat login kembali.`
                  : `User "${banTarget?.username}" tidak dapat login sampai di-unban.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBanConfirm}
                disabled={banLoading}
                className={banTarget?.status === "banned"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"}
              >
                {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (banTarget?.status === "banned" ? "Aktifkan" : "Ban")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  /* ─── REGULAR ADMIN VIEW ─── */
  const profileUrl = currentUser?.profile_url;

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Profile</h1>

      {/* Profile card */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <label className="cursor-pointer group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 text-xl font-bold overflow-hidden">
                  {editPhotoLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : profileUrl
                      ? <img src={profileUrl} alt={adminName} className="w-full h-full object-cover" />
                      : initials(adminName)
                  }
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus className="w-3 h-3 text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg capitalize truncate">{adminName}</p>
              <p className="text-slate-400 text-sm">Admin E-Rekap</p>
              {currentUser?.created_at && (
                <p className="text-slate-500 text-xs mt-0.5">
                  Bergabung {new Date(currentUser.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long" })}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={openEdit}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 px-2.5 flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {loadingRes ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Booking Saya", value: String(total), icon: CalendarCheck, color: "text-blue-400" },
              { label: "Omset Saya", value: formatRupiah(omset), icon: TrendingUp, color: "text-emerald-400" },
              { label: "DP Dikumpulkan", value: formatRupiah(dp), icon: Wallet, color: "text-amber-400" },
              { label: "Booking Cancel", value: String(cancel), icon: XCircle, color: "text-red-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="bg-slate-800/60 border-slate-700/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                  <div>
                    <p className="text-slate-400 text-xs">{label}</p>
                    <p className="text-white font-bold text-lg leading-tight">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Status Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["lunas", "pending", "cancel"] as const).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <Badge className={`${getStatusColor(s)} border text-xs px-2`}>
                    {getStatusLabel(s)}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s === "lunas" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: total > 0 ? `${(byStatus[s] / total) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-6 text-right">{byStatus[s]}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {propertyRanking.length > 0 && (
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold">Properti Paling Banyak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {propertyRanking.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                      <span className="text-slate-300 text-sm">{name}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{count} booking</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-400" />
              Edit Profil
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Username</Label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                placeholder="Username baru"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password Baru <span className="text-slate-500">(kosongkan jika tidak diubah)</span></Label>
              <div className="relative">
                <Input
                  type={editShowPwd ? "text" : "password"}
                  value={editPwd}
                  onChange={(e) => setEditPwd(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  placeholder="Password baru"
                />
                <button type="button" onClick={() => setEditShowPwd(!editShowPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {editShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-white">Batal</Button>
              <Button type="submit" disabled={editLoading || !editUsername.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white">
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
