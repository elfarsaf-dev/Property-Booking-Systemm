import { useState } from "react";
import { useLocation } from "wouter";
import { login, SUPERADMIN_USER } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";

const BASE_URL = "https://villadata.elfar.my.id";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);

    try {
      /* ── Coba endpoint /user (sistem baru) ── */
      let userId = "";
      let loginOk = false;

      try {
        const userRes = await fetch(`${BASE_URL}/user?user=${encodeURIComponent(username)}&pwd=${encodeURIComponent(password)}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.status === "banned") {
            setError("Akun Anda telah dinonaktifkan. Hubungi superadmin.");
            return;
          }
          userId = userData.id || "";
          loginOk = true;
        }
      } catch {
        /* endpoint /user belum ada, lanjut ke fallback */
      }

      /* ── Fallback: validasi via /reservations (sistem lama) ── */
      if (!loginOk) {
        const fallbackRes = await fetch(
          `${BASE_URL}/reservations?user=${encodeURIComponent(username)}&pwd=${encodeURIComponent(password)}`
        );
        if (!fallbackRes.ok) {
          setError("Username atau password salah.");
          return;
        }
        loginOk = true;
      }

      /* ── Simpan sesi — gunakan username asli yang diketik ── */
      const role = username.toLowerCase() === SUPERADMIN_USER ? "superadmin" : "admin";
      login(username, password, role, userId);
      setLocation("/dashboard");
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const isSuperAdminInput = username.toLowerCase() === SUPERADMIN_USER;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 border border-slate-700/50">
            <img src="https://raw.githubusercontent.com/elfarsaf-dev/lawuscape/main/uploads/1775130099890-12129.jpg"
              alt="E-Rekap" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">E-Rekap</h1>
          <p className="text-slate-400 text-sm mt-1">Kelola reservasi properti Anda</p>
        </div>
        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              {isSuperAdminInput && <ShieldCheck className="w-4 h-4 text-amber-400" />}
              Masuk ke Akun
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isSuperAdminInput
                ? "Mode Superadmin — akses penuh"
                : "Gunakan kredensial admin Anda"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 ${
                    isSuperAdminInput ? "border-amber-500/50" : ""
                  }`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                data-testid="button-login"
                disabled={loading}
                className={`w-full font-medium mt-2 ${
                  isSuperAdminInput
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} E-Rekap System
        </p>
      </div>
    </div>
  );
}
