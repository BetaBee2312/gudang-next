"use client";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { requestJSON, shortDate } from "@/lib/client";
import { confirmAction, notify } from "@/lib/sweetalert";
import { Check, ClipboardCheck, Plus, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";

type Product = { id_barang: string; nama_barang: string; qty_terkini: number; kategori: string };
type Branch = { kode_cabang: string; nama_cabang: string; singkatan?: string | null };
type Allocation = { id_alokasi: string; id_barang: string; nama_barang?: string; qty_teralokasi: number; nama_pemohon: string; status: string; tanggal: string; kode_cabang: string; nama_cabang?: string };
type ItemForm = { id_barang: string; qty: string };

type SearchOption<T extends string> = { value: T; label: string; searchText?: string; hint?: string };
function SearchSelect<T extends string>({ value, onChange, options, placeholder, required = false }: { value: T; onChange: (value: T) => void; options: SearchOption<T>[]; placeholder: string; required?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => `${option.label} ${option.searchText ?? ""} ${option.hint ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100);
  return <div className="search-select">
    <input className="field" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-label={placeholder} placeholder={selected ? selected.label : placeholder} value={open ? query : selected?.label ?? ""} required={required && !value} onFocus={() => { setQuery(""); setOpen(true); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && open && filtered[0]) { event.preventDefault(); onChange(filtered[0].value); setQuery(""); setOpen(false); } }} />
    {open && <div className="search-select-menu" role="listbox">{filtered.length ? filtered.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className={`search-select-option ${option.value === value ? "selected" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value); setQuery(""); setOpen(false); }}><span>{option.label}</span>{option.hint && <small>{option.hint}</small>}</button>) : <div className="search-select-empty">Tidak ada hasil yang cocok.</div>}</div>}
  </div>;
}

export default function AlokasiPage() {
  const [items, setItems] = useState<Allocation[]>([]); const [products, setProducts] = useState<Product[]>([]); const [branches, setBranches] = useState<Branch[]>([]); const [loading, setLoading] = useState(true); const [admin, setAdmin] = useState(false); const [userName, setUserName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`; });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [status, setStatus] = useState(""); const [notice, setNotice] = useState(""); const [modal, setModal] = useState(false); const [branch, setBranch] = useState(""); const [pemohon, setPemohon] = useState(""); const [lines, setLines] = useState<ItemForm[]>([{ id_barang: "", qty: "1" }]); const [saving, setSaving] = useState(false);
  async function load() { setLoading(true); try { const [a,p,b] = await Promise.all([requestJSON<{data: Allocation[]}>('/api/alokasi'), requestJSON<{data: Product[]}>('/api/barang'), requestJSON<{data: Branch[]}>('/api/cabang')]); setItems(a.data); setProducts(p.data); setBranches(b.data); } catch (e) { setNotice(e instanceof Error ? e.message : "Gagal memuat alokasi."); } finally { setLoading(false); } }
  useEffect(() => { load(); requestJSON<{user: {nama:string; kategori:string}}>("/api/auth/me").then(d => { setUserName(d.user.nama); setPemohon(d.user.nama); setAdmin(["admin", "creator"].includes(d.user.kategori.toLowerCase())); }).catch(() => {}); }, []);
  const monthOptions = useMemo(() => {
    const keys = new Set(items.map((item) => String(item.tanggal ?? "").slice(0, 7)).filter((value) => /^\d{4}-\d{2}$/.test(value)));
    return Array.from(keys).sort((a, b) => b.localeCompare(a)).map((key) => ({
      value: key,
      label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${key}-15T12:00:00`)),
    }));
  }, [items]);

  const filtered = useMemo(() => items.filter((item) => {
    const monthKey = String(item.tanggal ?? "").slice(0, 7);
    if (selectedMonth !== "all" && monthKey !== selectedMonth) return false;
    if (status && !item.status.toLowerCase().includes(status.toLowerCase())) return false;
    return `${item.id_alokasi} ${item.nama_barang ?? ""} ${item.nama_pemohon} ${item.nama_cabang ?? ""} ${item.status}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [items, status, query, selectedMonth]);

  const allocationGroups = useMemo(() => {
    const map = new Map<string, Allocation[]>();
    for (const item of filtered) {
      const key = String(item.tanggal ?? "").slice(0, 10) || "Tanggal tidak diketahui";
      const rows = map.get(key) ?? [];
      rows.push(item);
      map.set(key, rows);
    }
    return Array.from(map.entries())
      .map(([date, rows]) => ({ date, rows }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(allocationGroups.length / pageSize));
  const pageGroups = useMemo(() => allocationGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize), [allocationGroups, currentPage]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);
  const pending = items.filter(i => i.status.toLowerCase() === "pending").length;
  function addLine() { setLines(prev => [...prev, { id_barang: "", qty: "1" }]); }
  async function save(e: React.FormEvent) { e.preventDefault(); if (!branch) { setNotice("Pilih cabang tujuan alokasi."); return; } setSaving(true); try { const result = await requestJSON<{message:string}>('/api/alokasi', { method: 'POST', body: JSON.stringify({ nama_pemohon: pemohon || userName, kode_cabang: branch, items: lines.map(l => ({ id_barang:l.id_barang, qty:Number(l.qty) })) }) }); setNotice(""); await notify("Alokasi berhasil dibuat", "success", result.message); setModal(false); setLines([{ id_barang: "", qty: "1" }]); await load(); } catch (e) { setNotice(""); await notify("Gagal membuat alokasi", "error", e instanceof Error ? e.message : "Terjadi kesalahan."); } finally { setSaving(false); } }
  async function action(id: string, actionName: "approve" | "reject") { if (!(await confirmAction(actionName === "approve" ? "Konfirmasi alokasi ini?" : "Tolak alokasi?", actionName === "approve" ? "Status alokasi akan diubah menjadi disetujui." : "Stok pending akan dikembalikan."))) return; try { const d = await requestJSON<{message:string}>('/api/alokasi', { method: 'PATCH', body: JSON.stringify({ id_alokasi:id, action:actionName }) }); setNotice(""); await notify(actionName === "approve" ? "Alokasi disetujui" : "Alokasi ditolak", "success", d.message); await load(); } catch (e) { setNotice(""); await notify("Aksi alokasi gagal", "error", e instanceof Error ? e.message : "Terjadi kesalahan."); } }
  async function remove(i: Allocation) { if (!(await confirmAction("Hapus alokasi ini?", "Tindakan ini tidak bisa dibatalkan.", { confirmButtonColor: "#dc2626", confirmButtonText: "Ya, hapus" }))) return; try { await requestJSON('/api/alokasi', { method:'DELETE', body:JSON.stringify({id_alokasi:i.id_alokasi}) }); setNotice(""); await notify("Alokasi dihapus", "success"); await load(); } catch (e) { setNotice(""); await notify("Gagal menghapus alokasi", "error", e instanceof Error ? e.message : "Terjadi kesalahan."); } }
  function badge(statusText: string) { const s = statusText.toLowerCase(); const c = s === "pending" ? "badge-yellow" : s.startsWith("approved") ? "badge-green" : s.startsWith("rejected") ? "badge-red" : "badge"; return <span className={`badge ${c}`}>{statusText}</span>; }
  return <DashboardShell><div className="page-heading"><div><div className="eyebrow">Distribusi stok</div><h1>Alokasi Barang</h1><p>Catat permintaan distribusi ke cabang, pantau status, dan konfirmasi alokasi yang masih pending.</p></div><button className="btn btn-primary" onClick={() => { setBranch(""); setPemohon(userName); setLines([{id_barang:"", qty:"1"}]); setModal(true); }}><Plus/> Buat Alokasi</button></div>{notice && <div className="toast">{notice}<button className="float-right" onClick={() => setNotice("")}><X size={13}/></button></div>}<section className="panel"><div className="panel-header"><div><div className="panel-title">Riwayat alokasi</div><div className="panel-subtitle">Stok langsung berkurang saat alokasi dibuat.</div></div></div><div className="panel-body"><div className="toolbar"><label className="search-wrap"><Search/><input placeholder="Cari barang, cabang, pemohon…" value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1); }}/></label><select className="select-field" style={{width:"auto",minWidth:160}} value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}><option value="all">Semua bulan</option>{monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}</select><select className="select-field" style={{width:"auto",minWidth:160}} value={status} onChange={e => { setStatus(e.target.value); setCurrentPage(1); }}><option value="">Semua status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></div><div className="allocation-date-groups">
          {loading ? <div className="empty-state">Memuat riwayat…</div> : allocationGroups.length === 0 ? <div className="empty-state">Tidak ada riwayat alokasi pada bulan/filter ini.</div> : pageGroups.map(group => (
            <section className="allocation-date-group" key={group.date}>
              <div className="allocation-date-heading">{group.date === "Tanggal tidak diketahui" ? group.date : shortDate(group.date)} <span>{group.rows.length} alokasi</span></div>
              <div className="table-wrap"><table><thead><tr><th>Tanggal / ID</th><th>Barang</th><th>Cabang</th><th>Pemohon</th><th>Qty</th><th>Status</th>{admin && <th>Aksi</th>}</tr></thead><tbody>
                {group.rows.map(i => <tr key={i.id_alokasi}><td><div className="table-name">{shortDate(i.tanggal)}</div><div className="table-muted">{i.id_alokasi}</div></td><td><div className="table-name">{i.nama_barang ?? i.id_barang}</div><div className="table-muted">{i.id_barang}</div></td><td>{i.nama_cabang ?? i.kode_cabang}</td><td>{i.nama_pemohon}</td><td className="font-bold">{Number(i.qty_teralokasi).toLocaleString("id-ID")}</td><td>{badge(i.status)}</td>{admin && <td><div className="flex flex-wrap gap-1">{i.status.toLowerCase() === "pending" && <><button className="btn btn-sm btn-primary" onClick={() => action(i.id_alokasi, "approve")} title="Konfirmasi"><Check size={13}/></button><button className="btn btn-sm btn-danger" onClick={() => action(i.id_alokasi, "reject")} title="Tolak"><X size={13}/></button></>}<button className="btn btn-sm btn-danger" onClick={() => remove(i)} title="Hapus"><Trash2 size={13}/></button></div></td>}</tr>)}
              </tbody></table></div>
            </section>
          ))}
          {!loading && allocationGroups.length > 0 && <div className="handover-pagination"><span className="text-xs text-slate-500">Menampilkan grup tanggal {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, allocationGroups.length)} dari {allocationGroups.length}</span><div className="flex items-center gap-2"><button type="button" className="btn btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(page => Math.max(1,page-1))}>Sebelumnya</button><span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Halaman {currentPage} / {totalPages}</span><button type="button" className="btn btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages,page+1))}>Berikutnya</button></div></div>}
        </div></section>
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal" onSubmit={save}><div className="modal-head"><h3>Buat Alokasi Barang</h3><button className="btn btn-sm" type="button" onClick={()=>setModal(false)}><X/></button></div><div className="modal-body"><div className="form-grid"><div className="form-group"><label className="form-label">Nama pemohon</label><input className="field" value={pemohon} onChange={e=>setPemohon(e.target.value)} required/></div><div className="form-group"><label className="form-label">Cabang tujuan</label><SearchSelect value={branch} onChange={setBranch} placeholder="Cari nama atau kode cabang…" required options={branches.map(b=>({value:b.kode_cabang,label:b.nama_cabang,searchText:b.kode_cabang,hint:b.singkatan ? `Preview: ${b.singkatan} · ${b.kode_cabang}` : b.kode_cabang}))} /></div></div><div className="flex items-center justify-between mb-3 mt-2"><div className="panel-title">Barang yang dialokasikan</div><button type="button" className="btn btn-sm" onClick={addLine}><Plus size={13}/> Tambah baris</button></div>{lines.map((line, idx)=><div className="grid grid-cols-[minmax(0,1fr)_90px_34px] gap-2 mb-2" key={idx}><SearchSelect value={line.id_barang} onChange={value=>setLines(old=>old.map((l,j)=>j===idx?{...l,id_barang:value}:l))} placeholder="Cari nama / ID barang…" required options={products.map(p=>({value:p.id_barang,label:p.nama_barang,searchText:p.id_barang,hint:`${p.id_barang} · stok ${p.qty_terkini}`}))} /><input aria-label="Jumlah" type="number" min="1" className="field" value={line.qty} onChange={e=>setLines(old=>old.map((l,j)=>j===idx?{...l,qty:e.target.value}:l))} required/><button type="button" className="btn btn-sm btn-danger" onClick={()=>setLines(old=>old.filter((_,j)=>j!==idx))} disabled={lines.length===1}><X size={13}/></button></div>)}<p className="table-muted mt-3">Stok diperiksa dan dikurangi saat permintaan dibuat. Jika ditolak saat masih pending, stok dikembalikan otomatis.</p></div><div className="modal-foot"><button type="button" className="btn" onClick={()=>setModal(false)}>Batal</button><button className="btn btn-primary" disabled={saving}>{saving?"Menyimpan…":"Ajukan Alokasi"}</button></div></form></div>}
  </DashboardShell>;
}
