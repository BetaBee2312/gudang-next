"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ClipboardCheck, ClipboardList, Bot, LogOut, Menu, PackageSearch, Store, UserRound, Users, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
function normalizedDivision(value: string) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (["marketing", "mkt"].includes(key)) return "MKT";
  if (key === "md") return "MD";
  if (["marketing-ho", "mkt-ho"].includes(key)) return "MKT-HO";
  if (key === "md-ho") return "MD-HO";
  return key.toUpperCase();
}
function isMDDivision(value: string) {
  return ["MD", "MD-HO", "MD-D53", "MD-DGBG"].includes(normalizedDivision(value));
}


let cachedSession: { user: SessionUser; savedAt: number } | null = null;
const SESSION_CACHE_MS = 60_000;

function getCachedSession() {
  if (!cachedSession || Date.now() - cachedSession.savedAt > SESSION_CACHE_MS) return null;
  return cachedSession.user;
}



export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(() => getCachedSession()); const [ready, setReady] = useState(() => getCachedSession() !== null); const [mobileOpen, setMobileOpen] = useState(false); const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  useEffect(() => {
    let alive = true;
    // Cached session is only for faster navigation UI. API routes still validate every request.
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(data => {
      if (!alive) return;
      if (!data.user) {
        cachedSession = null;
        setUser(null);
        setReady(false);
        router.replace("/login");
        return;
      }
      cachedSession = { user: data.user, savedAt: Date.now() };
      setUser(data.user);
      setReady(true);
    }).catch(() => {
      if (!alive) return;
      if (!getCachedSession()) router.replace("/login");
    });
    return () => { alive = false; };
  }, [router]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  // Heartbeat menandai sesi ini aktif. Beberapa perangkat menghasilkan token sesi berbeda.
  useEffect(() => {
    if (!user) return;
    let active = true;
    const ping = async () => {
      if (!active) return;
      try {
        const response = await fetch("/api/presence", { method: "POST", cache: "no-store", keepalive: true });
        if (response.status === 401) {
          cachedSession = null;
          setUser(null);
          router.replace("/login");
        }
      } catch {
        // Percobaan berikutnya akan mengulang heartbeat jika koneksi sempat gagal.
      }
    };
    void ping();
    const timer = window.setInterval(() => void ping(), 20_000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.no_karyawan]);
  useEffect(() => {
    if (user && isMDDivision(user.division) && !["/barang", "/profil"].includes(pathname)) router.replace("/barang");
  }, [user, pathname, router]);
  async function logout() { cachedSession = null; await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
  if (!ready || !user) return <div className="min-h-screen grid place-items-center"><div className="text-sm text-slate-500">Memuat ruang kerja…</div></div>;
  const admin = ["admin", "creator"].includes(user.kategori.toLowerCase());
  const isMD = isMDDivision(user.division);
  const visibleNav = isMD ? [{ section: "Akun", items: nav.flatMap(group => group.items).filter(item => ["/barang", "/profil"].includes(item.href)) }] : nav;
  return <div className={`app-frame ${desktopCollapsed ? "sidebar-collapsed" : ""}`}>
    <div className={`mobile-nav-scrim ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><Link href="/profil" className="brand-user" title="Buka profil"><div className="avatar brand-avatar">{user.profilepic ? <img src={`/profile/${encodeURIComponent(user.profilepic)}`} alt="" /> : user.nama?.slice(0,1)?.toUpperCase() || "U"}</div><div className="brand-user-copy"><div className="brand-title">{user.nama}</div><div className="brand-sub">{user.kategori} · {user.division}</div></div></Link><button className="sidebar-toggle desktop-sidebar-toggle" onClick={() => setDesktopCollapsed(v=>!v)} aria-label={desktopCollapsed?"Tampilkan sidebar":"Sembunyikan sidebar"} title={desktopCollapsed?"Tampilkan sidebar":"Sembunyikan sidebar"}>{desktopCollapsed?<PanelLeftOpen size={16}/>:<PanelLeftClose size={16}/>}</button><button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={17}/></button></div>
      {visibleNav.map(group => <div key={group.section} className="mb-4"><div className="nav-section">{group.section}</div>{group.items.filter(item => !("admin" in item && item.admin && !admin) && (!isMD || ["/barang", "/profil"].includes(item.href))).map(item => { const Icon = item.icon; const active = pathname === item.href || (pathname === "/" && item.href === "/barang"); return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}><Icon/><span>{item.label}</span></Link>; })}</div>)}
      <div className="sidebar-bottom"><button className="logout-button" onClick={logout}><LogOut size={15}/><span>Keluar dari aplikasi</span></button></div>
    </aside>
    <div className="main-column"><header className="topbar"><div className="flex items-center gap-3"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu/></button><button className="desktop-sidebar-toggle topbar-sidebar-toggle" onClick={() => setDesktopCollapsed(v=>!v)} aria-label={desktopCollapsed?"Tampilkan sidebar":"Sembunyikan sidebar"} title={desktopCollapsed?"Tampilkan sidebar":"Sembunyikan sidebar"}>{desktopCollapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button><div><h2>{titles[pathname] ?? "Dashboard"}</h2></div></div><div className="topbar-right"><span className="status-pill"><span className="status-dot"/> Sistem inventori</span><Link href="/profil" className="avatar topbar-profile-avatar" title="Profil saya">{user.profilepic ? <img src={`/profile/${encodeURIComponent(user.profilepic)}`} alt="" /> : user.nama?.slice(0,1)?.toUpperCase() || "U"}</Link></div></header><main className="main-content">{children}</main></div>
  </div>;
}
