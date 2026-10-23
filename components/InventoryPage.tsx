"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CalendarClock,
  Download,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Save,
} from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { requestJSON, shortDate, toDateInput } from "@/lib/client";
import Swal from "sweetalert2";
import { notify } from "@/lib/sweetalert";

type Product = {
  id_barang: string;
  gambar?: string | null;
  nama_barang: string;
  kategori: string;
  expired?: string | null;
  qty_awal: number;
  qty_terkini: number;
  teralokasi: number;
  bulan: string;
  plu?: string | null;
};

// Menambahkan field newImage khusus untuk menyimpan data file foto di Edit Massal
type BulkRow = {
  id_barang: string;
  nama_barang: string;
  kategori: string;
  expired: string;
  qty_awal: string;
  qty_terkini: string;
  plu: string;
  newImage?: File | null; 
};

const categories = ["Marketing", "MD", "Marketing-D53", "MD-D53", "Marketing-DGBG", "MD-DGBG"];
const emptyForm = { nama_barang: "", kategori: "Marketing", expired: "", qty_awal: "0", qty_terkini: "0", plu: "" };

function expiryStatus(value?: string | null): "expired" | "soon" | "safe" | "unknown" {
  if (!value) return "unknown";
  const raw = String(value).slice(0, 10);
  const parts = raw.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part) || part <= 0)) return "unknown";
  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(expiry.getTime())) return "unknown";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 90) return "soon";
  return "safe";
}


export default function InventoryPage({ habis = false }: { habis?: boolean }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [selected, setSelected] = useState<string[]>([]);
  const [admin, setAdmin] = useState(false);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkModal, setBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await requestJSON<{ data: Product[] }>(`/api/barang?habis=${habis ? 1 : 0}`);
      setItems(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat barang.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    requestJSON<{ user: { kategori: string } }>("/api/auth/me")
      .then((d) => setAdmin(["admin", "creator"].includes((d.user?.kategori || "").toLowerCase())))
      .catch(() => {});
  }, [habis]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!category || item.kategori === category) &&
          `${item.nama_barang} ${item.id_barang} ${item.plu ?? ""}`.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query, category]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage],
  );
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, habis]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.id_barang));
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty_terkini || 0), 0);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setImage(null);
    setModal(true);
  }

  function openEdit(item: Product) {
    setEditing(item);
    setForm({
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      expired: toDateInput(item.expired),
      qty_awal: String(item.qty_awal),
      qty_terkini: String(item.qty_terkini),
      plu: item.plu ?? "",
    });
    setImage(null);
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast("");
    try {
      if (editing) {
        await requestJSON("/api/barang", {
          method: "PATCH",
          body: JSON.stringify({
            id_barang: editing.id_barang,
            nama_barang: form.nama_barang,
            kategori: form.kategori,
            expired: form.expired || null,
            plu: form.plu || null,
            qty_awal: Number(form.qty_awal),
            qty_terkini: Number(form.qty_terkini),
          }),
        });
      } else {
        const data = new FormData();
        data.set("nama_barang", form.nama_barang);
        data.set("kategori", form.kategori);
        data.set("expired", form.expired);
        data.set("qty_awal", form.qty_awal);
        data.set("plu", form.plu);
        if (image) data.set("gambar", image);
        await requestJSON("/api/barang", { method: "POST", body: data });
      }
      setModal(false);
      setToast("");
      await notify(editing ? "Barang diperbarui" : "Barang berhasil ditambahkan", "success");
      await load();
    } catch (e) {
      setToast("");
      await notify("Gagal menyimpan barang", "error", e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected.length) return;

    // Ambil nama barang untuk ditampilkan di konfirmasi
    const chosenItems = items.filter((item) => selected.includes(item.id_barang));
    const itemsList = chosenItems.map((item) => `- ${item.nama_barang}`).join("\n");

    const confirmation = await Swal.fire({
      title: `Hapus ${selected.length} barang?`,
      text: chosenItems.length ? chosenItems.slice(0, 5).map(item => item.nama_barang).join(", ") + (chosenItems.length > 5 ? ` dan ${chosenItems.length - 5} lainnya` : "") : itemsList,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;
    
    try {
      await requestJSON("/api/barang", { method: "DELETE", body: JSON.stringify({ ids: selected }) });
      setSelected([]);
      setToast("");
      await notify("Barang terpilih berhasil dihapus", "success");
      await load();
    } catch (e) {
      setToast("");
      await notify("Gagal menghapus barang", "error", e instanceof Error ? e.message : "Terjadi kesalahan.");
    }
  }

  function openBulkEdit() {
    const chosen = items.filter((item) => selected.includes(item.id_barang));
    setBulkRows(
      chosen.map((item) => ({
        id_barang: item.id_barang,
        nama_barang: item.nama_barang,
        kategori: item.kategori,
        expired: toDateInput(item.expired),
        qty_awal: String(item.qty_awal),
        qty_terkini: String(item.qty_terkini),
        plu: item.plu ?? "",
        newImage: null, // Reset state gambar
      }))
    );
    setBulkModal(true);
  }

  async function saveBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    setBulkSaving(true);
    try {
      if (!bulkRows.length) { await notify("Belum ada barang yang dipilih", "warning", "Pilih setidaknya satu barang untuk diedit."); return; }
      if (bulkRows.some((row) => !row.nama_barang.trim() || !Number.isInteger(Number(row.qty_awal)) || Number(row.qty_awal) < 0 || !Number.isInteger(Number(row.qty_terkini)) || Number(row.qty_terkini) < 0)) { await notify("Data stok tidak valid", "error", "Nama wajib diisi dan jumlah stok harus bilangan bulat nol atau lebih."); return; }
      if (bulkRows.some((row) => row.newImage && (row.newImage.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(row.newImage.type)))) { await notify("Foto tidak valid", "error", "Foto harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB."); return; }
      // Kita gunakan FormData agar bisa mengirim kombinasi JSON string dan file (gambar) massal
      const formData = new FormData();
      
      const payloadItems = bulkRows.map((row) => ({
        id_barang: row.id_barang,
        nama_barang: row.nama_barang,
        kategori: row.kategori,
        expired: row.expired || null,
        qty_awal: Number(row.qty_awal),
        qty_terkini: Number(row.qty_terkini),
        plu: row.plu || null,
      }));

      formData.append("items", JSON.stringify(payloadItems));

      // Append file individual sesuai id_barang nya (jika ada file yang dipilih)
      bulkRows.forEach((row) => {
        if (row.newImage) {
          formData.append(`image_${row.id_barang}`, row.newImage);
        }
      });

      const d = await requestJSON<{ message: string }>("/api/barang/bulk", {
        method: "POST",
        body: formData,
      });
      
      setBulkModal(false);
      setSelected([]);
      setToast("");
      await notify("Edit massal berhasil disimpan", "success", d.message);
      await load();
    } catch (e) {
      setToast("");
      await notify("Gagal mengedit massal", "error", e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function renew() {
    const confirmation = await Swal.fire({
      title: "Renew stok bulanan?",
      text: "Stok sekarang akan diarsipkan dan stok terkini menjadi stok awal periode berikutnya.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, renew stok",
      cancelButtonText: "Batal",
      confirmButtonColor: "#334155",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;
    try {
      const m = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date());
      const data = await requestJSON<{ message: string }>("/api/barang/renew", {
        method: "POST",
        body: JSON.stringify({ bulan: m }),
      });
      setToast("");
      await notify("Stok berhasil diperbarui", "success", data.message);
      await load();
    } catch (e) {
      setToast("");
      await notify("Renew stok gagal", "error", e instanceof Error ? e.message : "Terjadi kesalahan.");
    }
  }

  const title = habis ? "Stok Habis / MD" : "Daftar Barang";

  return (
    <DashboardShell>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Inventori & kontrol stok</div>
          <h1>{title}</h1>
        </div>
        <div className="heading-actions">
          {!habis && admin && (
            <>
              <button className="btn" onClick={renew}>
                <RefreshCw size={16} /> Renew Bulanan
              </button>
              <button className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} /> Tambah Barang
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`toast ${
            toast.toLowerCase().includes("gagal") ||
            toast.toLowerCase().includes("tidak bisa") ||
            toast.toLowerCase().includes("belum")
              ? "error"
              : ""
          }`}
        >
          {toast}
          <button className="float-right" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar: search, filters, and bulk actions */}
      <div className="toolbar flex flex-wrap items-center gap-3">
        <label className="search-wrap flex-1 min-w-[200px]">
          <Search size={16} />
          <input placeholder="Cari nama, ID barang, atau PLU…" value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} />
        </label>
        <select className="select-field" style={{ width: "auto", minWidth: 170 }} value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}>
          <option value="">Semua kategori</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {admin && (
          <label className="inventory-select-all">
            <input type="checkbox" checked={allFilteredSelected} disabled={filtered.length === 0} onChange={(event) => setSelected((current) => event.target.checked ? [...new Set([...current, ...filtered.map((item) => item.id_barang)])] : current.filter((id) => !filtered.some((item) => item.id_barang === id)))} />
            <span>Pilih Semua ({filtered.length})</span>
          </label>
        )}
        {admin && selected.length > 0 && (
          <div className="hidden md:flex gap-2">
            <button type="button" className="btn" onClick={openBulkEdit}><Pencil size={15} /> Edit Massal ({selected.length})</button>
            <button type="button" className="btn btn-danger" onClick={deleteSelected}><Trash2 size={15} /> Hapus ({selected.length})</button>
          </div>
        )}
        {!habis && (
          <div className="flex gap-2 w-full md:w-auto">
            <input type="month" className="field flex-1 md:flex-none" style={{ width: 150 }} value={month} onChange={(e) => setMonth(e.target.value)} />
            <a className="btn justify-center" href={`/api/barang/export?bulan=${encodeURIComponent(month)}${category ? `&filter=${encodeURIComponent(category.toLowerCase())}` : ""}`}><Download size={16} /> Export</a>
          </div>
        )}
      </div>

      {error && (
        <div className="toast error">
          {error}{" "}
          <button className="underline" onClick={load}>
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel">
          <div className="empty-state">Memuat data barang…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <Package size={32} />
            <div className="empty-title">Tidak ada barang ditemukan</div>
            <div>Coba ubah kata kunci atau filter kategori.</div>
          </div>
        </div>
      ) : (
        <>
        <div className="product-grid pb-16 md:pb-0"> {/* Tambah padding bawah khusus di mobile agar tidak terhalang bottom nav */}
          {pageItems.map((item) => (
            <article className="product-card" key={item.id_barang}>
              {admin && (
                <input
                  className="product-check"
                  type="checkbox"
                  aria-label={`Pilih ${item.nama_barang}`}
                  checked={selected.includes(item.id_barang)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked ? [...s, item.id_barang] : s.filter((id) => id !== item.id_barang)
                    )
                  }
                />
              )}
              <div className="product-image">
                {item.gambar ? (
                  <img
                    src={`/image/${encodeURIComponent(item.gambar)}`}
                    alt={item.nama_barang}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    width={480}
                    height={480}
                    onError={(e) => {
                      const image = e.currentTarget;
                      if (image.dataset.legacyFallback !== "1") {
                        image.dataset.legacyFallback = "1";
                        image.style.display = "none";
                      } else {
                        image.style.display = "none";
                      }
                    }}
                  />
                ) : (
                  <div className="image-placeholder">
                    <Package />
                  </div>
                )}
              </div>
              <div className="product-content">
                <div className="product-id">
                  {item.id_barang} · {item.kategori}
                </div>
                <div className="product-title">{item.nama_barang}</div>
                <span
                  className={`badge ${
                    Number(item.qty_terkini) <= 0
                      ? "badge-red"
                      : Number(item.qty_terkini) <= 5
                      ? "badge-yellow"
                      : "badge-green"
                  }`}
                >
                  Stok {Number(item.qty_terkini).toLocaleString("id-ID")}
                </span>
                <div className="product-expiry-row">
                  <span className={`expiry-status expiry-${expiryStatus(item.expired)}`}>
                    <span className="expiry-dot" />
                    {item.expired ? `Expired: ${shortDate(item.expired)}` : "Expired: belum diatur"}
                  </span>
                </div>
                <div className="product-expired product-month">Update stok: {item.bulan || "-"}</div>
                <div className="product-meta">
                  {admin && (
                    <button className="btn btn-sm" onClick={() => openEdit(item)} title="Edit barang">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {filtered.length > 0 && (
          <div className="inventory-pagination">
            <span className="table-muted">Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} barang</span>
            <div className="inventory-pagination-controls">
              <button type="button" className="btn btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Sebelumnya</button>
              <span className="inventory-page-number">Halaman {currentPage} / {totalPages}</span>
              <button type="button" className="btn btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Berikutnya</button>
            </div>
          </div>
        )}
        </>
      )}

      {/* MODAL BOTTOM NAVBAR UNTUK MOBILE - Akan melayang dari bawah saat item dicentang di HP */}
      {admin && selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-between items-center z-50 md:hidden shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.1)]">
          <div className="text-sm font-semibold text-indigo-700">
            {selected.length} Terpilih
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm shadow-sm" onClick={openBulkEdit}>
              <Pencil size={14} /> Edit
            </button>
            <button className="btn btn-sm btn-danger shadow-sm" onClick={deleteSelected}>
              <Trash2 size={14} /> Hapus
            </button>
            <button className="btn btn-sm text-slate-500 hover:bg-slate-100" onClick={() => setSelected([])}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL SINGLE ADD/EDIT (Tetap sama) */}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h3>{editing ? "Edit Barang" : "Tambah Barang"}</h3>
              <button type="button" className="btn btn-sm" onClick={() => setModal(false)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama barang</label>
                <input
                  className="field"
                  value={form.nama_barang}
                  onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="select-field"
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stok awal</label>
                  <input
                    type="number"
                    min="0"
                    className="field"
                    value={form.qty_awal}
                    onChange={(e) => setForm({ ...form, qty_awal: e.target.value })}
                    required
                  />
                </div>
                {editing && (
                  <div className="form-group">
                    <label className="form-label">Stok terkini</label>
                    <input
                      type="number"
                      min="0"
                      className="field"
                      value={form.qty_terkini}
                      onChange={(e) => setForm({ ...form, qty_terkini: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Tanggal expired</label>
                  <input
                    type="date"
                    className="field"
                    value={form.expired}
                    onChange={(e) => setForm({ ...form, expired: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PLU</label>
                  <input
                    className="field"
                    value={form.plu}
                    onChange={(e) => setForm({ ...form, plu: e.target.value })}
                    placeholder="Opsional"
                  />
                </div>
              </div>
              {!editing && (
                <div className="form-group">
                  <label className="form-label">Foto barang (maksimal 5 MB)</label>
                  <label className="btn w-full">
                    <ImagePlus size={16} /> {image ? image.name : "Pilih gambar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Barang"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL BULK EDIT (Ditambahkan kolom Upload Foto per baris) */}
      {bulkModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBulkModal(false);
          }}
        >
          <form className="modal bulk-edit-modal" onSubmit={saveBulkEdit}>
            <div className="modal-head">
              <div>
                <h3>Edit Massal Barang</h3>
                <div className="panel-subtitle">
                  Periksa setiap baris. Isi foto baru jika ingin mengganti gambar. Qty terkini akan menjadi stok aktual.
                </div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setBulkModal(false)}>
                <X />
              </button>
            </div>
            <div className="modal-body bulk-edit-body p-0">
              <div className="bulk-edit-mobile bulk-edit-cards">
                {bulkRows.map((row, index) => (
                  <section className="bulk-item-card" key={row.id_barang}>
                    <div className="bulk-item-heading"><span className="badge">{row.id_barang}</span><span className="bulk-item-number">Barang {index + 1} dari {bulkRows.length}</span></div>
                    <div className="form-group"><label className="form-label">Nama barang</label><input className="field" value={row.nama_barang} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, nama_barang: e.target.value } : v))} required /></div>
                    <div className="form-group"><label className="form-label">Foto baru (opsional)</label><input type="file" accept="image/jpeg,image/png,image/webp" className="field bulk-image-input" onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, newImage: e.target.files?.[0] ?? null } : v))} />{row.newImage && <div className="bulk-file-name">{row.newImage.name}</div>}</div>
                    <div className="bulk-item-grid">
                      <div className="form-group"><label className="form-label">Kategori</label><select className="select-field" value={row.kategori} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, kategori: e.target.value } : v))}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Tanggal expired</label><input type="date" className="field" value={row.expired} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, expired: e.target.value } : v))} /></div>
                      <div className="form-group"><label className="form-label">Stok awal</label><input type="number" min="0" className="field" value={row.qty_awal} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, qty_awal: e.target.value } : v))} required /></div>
                      <div className="form-group"><label className="form-label">Stok terkini</label><input type="number" min="0" className="field" value={row.qty_terkini} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, qty_terkini: e.target.value } : v))} required /></div>
                      <div className="form-group bulk-plu-field"><label className="form-label">PLU</label><input className="field" value={row.plu} onChange={(e) => setBulkRows((old) => old.map((v, i) => i === index ? { ...v, plu: e.target.value } : v))} /></div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setBulkModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" disabled={bulkSaving}>
                <Save size={14} />
                {bulkSaving ? "Menyimpan…" : "Simpan Semua Perubahan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}