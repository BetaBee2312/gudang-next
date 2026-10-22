"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ClipboardCheck, ClipboardList, Bot, LogOut, Menu, PackageSearch, Store, UserRound, Users, X } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { section: "Inventori", items: [
    { href: "/barang", label: "Daftar Barang", icon: Boxes },
    { href: "/stok-habis", label: "Stok Habis", icon: PackageSearch },
    { href: "/alokasi", label: "Alokasi Barang", icon: ClipboardCheck },
    { href: "/serah-terima", label: "Serah Terima", icon: ClipboardList },
  ]},
  { section: "Pengelolaan", items: [
    { href: "/cabang", label: "Daftar Cabang", icon: Store },
    { href: "/akun", label: "Akun Terdaftar", icon: Users, admin: true },
  ]},
  { section: "Lainnya", items: [
    { href: "/chat-ai", label: "Gudang Marketing AI", icon: Bot },
    { href: "/profil", label: "Profil Saya", icon: UserRound },
  ]},
];
const titles: Record<string, string> = { "/barang": "Daftar Barang", "/stok-habis": "Stok Habis / MD", "/alokasi": "Alokasi Barang", "/serah-terima": "Serah Terima", "/cabang": "Daftar Cabang", "/akun": "Akun Terdaftar", "/chat-ai": "Gudang Marketing AI", "/profil": "Profil Saya" };

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null); const [ready, setReady] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(data => {
      if (!alive) return;
      if (!data.user) { router.replace("/login"); return; }
      setUser(data.user); setReady(true);
    }).catch(() => router.replace("/login"));
    return () => { alive = false; };
  }, [router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (user && user.division.toLowerCase() === "md" && !["/barang", "/profil"].includes(pathname)) router.replace("/barang");
  }, [user, pathname, router]);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
  if (!ready || !user) return <div className="min-h-screen grid place-items-center"><div className="text-sm text-slate-500">Memuat ruang kerja…</div></div>;
  const admin = ["admin", "creator"].includes(user.kategori.toLowerCase());
  return <div className="app-frame">
    <div className={`mobile-nav-scrim ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">GM</div><div><div className="brand-title">Gudang Marketing</div><div className="brand-sub">Inventory workspace</div></div><button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={17}/></button></div>
      {nav.map(group => <div key={group.section} className="mb-4"><div className="nav-section">{group.section}</div>{group.items.filter(item => !("admin" in item && item.admin && !admin) && (user.division.toLowerCase() !== "md" || ["/barang", "/profil"].includes(item.href))).map(item => { const Icon = item.icon; const active = pathname === item.href || (pathname === "/" && item.href === "/barang"); return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}><Icon/><span>{item.label}</span></Link>; })}</div>)}
      <div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{user.profilepic ? <img src={`/profile/${encodeURIComponent(user.profilepic)}`} alt="" /> : user.nama?.slice(0, 1)?.toUpperCase() || "U"}</div><div className="min-w-0"><div className="user-name truncate">{user.nama}</div><div className="user-role">{user.kategori} · {user.division}</div></div></div><button className="logout-button" onClick={logout}><LogOut size={15}/> Keluar dari aplikasi</button></div>
    </aside>
    <div className="main-column"><header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu/></button><div><div className="topbar-kicker">Ruang kerja / Gudang Marketing</div><h2>{titles[pathname] ?? "Dashboard"}</h2></div></div><div className="topbar-right"><span className="status-pill"><span className="status-dot"/> Sistem inventori</span><Link href="/profil" className="avatar" title="Profil saya">{user.profilepic ? <img src={`/profile/${encodeURIComponent(user.profilepic)}`} alt="" /> : user.nama?.slice(0,1)?.toUpperCase() || "U"}</Link></div></header><main className="main-content">{children}</main></div>
  </div>;
}
