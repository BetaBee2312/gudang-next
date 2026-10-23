"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { notify } from "@/lib/sweetalert";

export default function LoginPage() {
  const router = useRouter(); const [noKaryawan, setNoKaryawan] = useState(""); const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.user) router.replace(d.user.division === "MD" ? "/stok-habis" : "/barang"); }).catch(() => {}); }, [router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ no_karyawan: noKaryawan, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Login gagal."); router.replace(data.redirect || "/barang"); router.refresh(); }
    catch (e) { const message = e instanceof Error ? e.message : "Login gagal."; setError(""); await notify("Login gagal", "error", message); } finally { setLoading(false); }
  }
  return (
    <main className="login-screen login-screen-card">
      <section className="login-card-wrap" aria-label="Login Gudang Marketing">
        <form className="login-card login-card-clean" onSubmit={submit}>
          <div className="login-logo-wrap">
            <img src="/image/logoyomart.png" alt="Yomart" className="login-logo" />
          </div>
          <div className="login-version">SISTEM GUDANG MARKETING</div>
          <h1>Login</h1>
          <p className="login-subtitle">Masuk menggunakan akun karyawan yang terdaftar.</p>
          {error && <div className="toast error">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="no">Nomor karyawan</label>
            <div className="login-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input id="no" className="field login-input" autoFocus value={noKaryawan} onChange={e => setNoKaryawan(e.target.value)} placeholder="Masukkan nomor karyawan" autoComplete="username" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input id="password" className="field login-input login-password-input" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan password" autoComplete="current-password" required />
              <button type="button" className="login-toggle-password" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>{loading ? "Memeriksa akun…" : "Masuk"}</button>
          <p className="login-help">Gunakan kredensial yang sudah terdaftar. Pastikan koneksi sistem aktif jika gagal masuk.</p>
          <div className="login-footer">Gudang Marketing <span>•</span> {new Date().getFullYear()}</div>
        </form>
      </section>
    </main>
  );
}
}
