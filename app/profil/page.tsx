"use client";
import { useEffect, useRef, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { requestJSON } from "@/lib/client";
import { Check, LockKeyhole, UserRound, Upload, X } from "lucide-react";

type Profile = { no_karyawan: string; nama: string; jabatan?: string; division: string; kategori: string; profilepic?: string | null };
export default function ProfilPage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestJSON<{ user: Profile }>("/api/auth/me")
      .then((data) => { setUser(data.user); setNik(data.user.no_karyawan); setNama(data.user.nama); })
      .catch((err) => { setNotice(err.message); setError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!photo) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(false); setNotice("");
    if (password && password !== confirmPass) { setNotice("Konfirmasi password tidak sama."); setError(true); return; }
    if (photo && !photo.type.startsWith("image/")) { setNotice("File foto harus berupa gambar."); setError(true); return; }
    if (photo && photo.size > 5 * 1024 * 1024) { setNotice("Ukuran foto maksimal 5 MB."); setError(true); return; }
    if (!nik.trim() || !nama.trim()) { setNotice("NIK dan nama wajib diisi."); setError(true); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("no_karyawan", nik.trim());
      formData.append("nama", nama.trim());
      if (password) formData.append("password", password);
      if (photo) formData.append("photo", photo);
      const d = await requestJSON<{ message: string; nikChanged?: boolean }>("/api/akun/profile", {
        method: "PATCH",
        body: formData,
      });
      setNotice(d.message);
      setPassword("");
      setConfirmPass("");
      if (d.nikChanged || nik.trim() !== user?.no_karyawan) {
        window.location.replace("/login");
        return;
      }
      const fresh = await requestJSON<{ user: Profile }>("/api/auth/me");
      setUser(fresh.user);
      setNik(fresh.user.no_karyawan);
      setNama(fresh.user.nama);
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";

    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan profil.");
      setError(true);
    } finally { setSaving(false); }
  }

  return <DashboardShell>
    <div className="page-heading"><div><div className="eyebrow">Pengaturan personal</div><h1>Profil Saya</h1><p>Kelola NIK, nama, password, dan foto profil.</p></div></div>
    {notice && <div className={`toast ${error ? "error" : ""}`}>{notice}<button className="float-right" type="button" onClick={() => setNotice("")}><X size={13}/></button></div>}
    {loading ? <div className="panel"><div className="empty-state">Memuat profil…</div></div> : user && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
      <form className="panel" onSubmit={save}>
        <div className="panel-header"><div><div className="panel-title">Informasi akun</div><div className="panel-subtitle">Jika NIK diubah, kamu akan otomatis logout dan perlu login menggunakan NIK baru.</div></div><div className="stat-icon"><UserRound/></div></div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="form-group"><label className="form-label">NIK / Nomor karyawan</label><input className="field" value={nik} onChange={e => setNik(e.target.value)} required maxLength={64} autoComplete="username"/></div>
            <div className="form-group"><label className="form-label">Kategori akses</label><input className="field bg-slate-50" value={user.kategori} disabled/></div>
          </div>
          <div className="form-group"><label className="form-label">Nama lengkap</label><input className="field" value={nama} onChange={e => setNama(e.target.value)} required maxLength={150}/></div>
          <div className="form-grid"><div className="form-group"><label className="form-label">Jabatan</label><input className="field bg-slate-50" value={user.jabatan || "-"} disabled/></div><div className="form-group"><label className="form-label">Divisi</label><input className="field bg-slate-50" value={user.division} disabled/></div></div>
          <div className="form-group mt-4"><label className="form-label">Password baru</label><input type="password" className="field" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin mengganti" autoComplete="new-password"/></div>
          <div className="form-group"><label className="form-label">Konfirmasi password baru</label><input type="password" className="field" minLength={6} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ulangi password baru" autoComplete="new-password"/></div>
          <div className="flex justify-end mt-5"><button className="btn btn-primary" disabled={saving}><Check size={14}/>{saving ? "Menyimpan…" : "Simpan Profil"}</button></div>
        </div>
      </form>
      <aside className="panel h-fit"><div className="panel-body">
        <div className="profile-photo-preview">
          {photoPreview ? <img src={photoPreview} alt="Preview foto profil" /> : user.profilepic ? <img src={`/profile/${encodeURIComponent(user.profilepic)}`} alt={user.nama} /> : <div className="avatar w-20 h-20 text-2xl"><UserRound/></div>}
        </div>
        <div className="text-lg font-extrabold display-font mt-3">{nama || user.nama}</div><div className="text-xs text-slate-500 mt-1">{user.jabatan || "Tanpa jabatan"}</div>
        <div className="mt-4 flex gap-2 flex-wrap"><span className="badge">{user.division}</span><span className="badge badge-green">{user.kategori}</span></div>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => setPhoto(e.target.files?.[0] ?? null)}/>
        <button type="button" className="btn mt-4 w-full" onClick={() => fileRef.current?.click()}><Upload size={14}/> Pilih Foto Profil</button>
        {photo && <div className="text-xs text-slate-500 mt-2 break-all">{photo.name}<button type="button" className="ml-2 underline" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}>Batalkan</button></div>}
        <div className="border-t border-slate-100 mt-5 pt-4 text-xs leading-6 text-slate-500 flex gap-3"><LockKeyhole size={16} className="shrink-0 mt-1"/><span>Password disimpan sebagai hash. Foto maksimal 5 MB.</span></div>
      </div></aside>
    </div>}
  </DashboardShell>;
}
