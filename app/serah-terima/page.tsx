"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import DashboardShell from "@/components/DashboardShell";
import { requestJSON, shortDate } from "@/lib/client";
import { confirmAction, notify } from "@/lib/sweetalert";
import {
  ClipboardList,
  Plus,
  Search,
  Trash2,
  X,
  Download,
  FileDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Branch = {
  kode_cabang: string | number; // Menambahkan union number untuk jaga-jaga dari respons API
  nama_cabang: string;
  singkatan?: string;
};

type Handover = {
  id: string;
  nama: string;
  jabatan: string;
  tujuan: string;
  tanggal: string;
  keperluan: string;
  jumlah: string;
  cabang: string;
};

type Line = { keperluan: string; jumlah: string; cabang: string[] };
type Product = { id_barang: string; nama_barang: string; qty_terkini: number; kategori: string; plu?: string | null };
type HandoverGroup = { key: string; rows: Handover[]; head: Handover };

const EMPTY_LINE: Line = { keperluan: "", jumlah: "1", cabang: [] };

type SearchOption<T extends string> = { value: T; label: string; searchText?: string; hint?: string };

function MultiSearchSelect<T extends string>({ values, onChange, options, placeholder }: { values: T[]; onChange: (values: T[]) => void; options: SearchOption<T>[]; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => values.includes(option.value));
  const filtered = options.filter((option) => !values.includes(option.value) && `${option.label} ${option.searchText ?? ""} ${option.hint ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20);
  return <div className="search-select">
    <div className="multi-select-control" onClick={() => setOpen(true)}>
      {selected.map((option) => <button type="button" key={option.value} className="multi-select-chip" onClick={(event) => { event.stopPropagation(); onChange(values.filter((value) => value !== option.value)); }} title={`Hapus ${option.label}`}>
        <span>{option.label}</span><span aria-hidden="true">×</span>
      </button>)}
      <input className="multi-select-input" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-label={placeholder} placeholder={selected.length ? "Cari cabang lain…" : placeholder} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onBlur={() => setOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" && open && filtered[0]) { event.preventDefault(); onChange([...values, filtered[0].value]); setQuery(""); } if (event.key === "Backspace" && !query && values.length) onChange(values.slice(0, -1)); }} />
    </div>
    {open && <div className="search-select-menu" role="listbox">{filtered.length ? filtered.map((option) => <button type="button" role="option" aria-selected={false} key={option.value} className="search-select-option" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange([...values, option.value]); setQuery(""); }}><span>{option.label}</span>{option.hint && <small>{option.hint}</small>}</button>) : <div className="search-select-empty">{selected.length ? "Semua hasil yang cocok sudah dipilih." : "Tidak ada hasil yang cocok."}</div>}</div>}
    {selected.length > 0 && <p className="table-muted mt-1">Kode cabang: <strong>{selected.map((option) => option.value).join(", ")}</strong></p>}
  </div>;
}

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


/**
 * tb_serah_terima menyimpan satu baris per item.
 * Contoh 20251202-002a dan 20251202-002b adalah satu dokumen: 20251202-002.
 */
function getDocumentId(id: string): string {
  const cleanId = String(id ?? "").trim();
  const match = cleanId.match(/^(\d{8}-\d{3})[a-z]$/i);
  return match?.[1] ?? cleanId;
}

function getDateParts(value: string) {
  const date = new Date(`${String(value ?? "").slice(0, 10)}T12:00:00`);
  return {
    date,
    day: new Intl.DateTimeFormat("id-ID", { weekday: "long" })
      .format(date)
      .toUpperCase(),
    dateText: new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
      .format(date)
      .toUpperCase(),
  };
}

export default function SerahTerimaPage() {
  const [items, setItems] = useState<Handover[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`; });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  
  // State untuk melacak grup mana saja yang daftar item-nya sedang di-expand penuh
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const [handoverResponse, branchResponse, productResponse] = await Promise.all([
        requestJSON<{ data: Handover[] }>("/api/serah-terima"),
        requestJSON<{ data: Branch[] }>("/api/cabang"),
        requestJSON<{ data: Product[] }>("/api/barang"),
      ]);
      setItems(handoverResponse.data ?? []);
      setBranches(branchResponse.data ?? []);
      setProducts(productResponse.data ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    requestJSON<{
      user: { nama: string; jabatan?: string; kategori: string };
    }>("/api/auth/me")
      .then((data) => {
        setSessionName(data.user.nama);
        setNama(data.user.nama);
        setJabatan(data.user.jabatan ?? "");
        setAdmin(["admin", "creator"].includes(data.user.kategori.toLowerCase()));
      })
      .catch(() => undefined);
  }, []);

  // Kelompokkan berdasarkan ID dokumen, yaitu ID tanpa huruf suffix a/b/c.
  const groups = useMemo<HandoverGroup[]>(() => {
    const map = new Map<string, Handover[]>();

    for (const item of items) {
      const key = getDocumentId(item.id);
      const groupRows = map.get(key) ?? [];
      groupRows.push(item);
      map.set(key, groupRows);
    }

    return Array.from(map.entries())
      .map(([key, rows]) => {
        const sortedRows = [...rows].sort((a, b) => a.id.localeCompare(b.id));
        return { key, rows: sortedRows, head: sortedRows[0] };
      })
      .sort((a, b) => {
        const dateCompare = String(b.head.tanggal).localeCompare(String(a.head.tanggal));
        return dateCompare || b.key.localeCompare(a.key);
      });
  }, [items]);

  // Jika pencarian cocok dengan satu item, tampilkan seluruh dokumen/kelompoknya.
  const monthOptions = useMemo(() => {
    const keys = new Set(
      groups
        .map((group) => String(group.head.tanggal ?? "").slice(0, 7))
        .filter((value) => /^\d{4}-\d{2}$/.test(value)),
    );
    return Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        value: key,
        label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
          .format(new Date(`${key}-15T12:00:00`)),
      }));
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return groups.filter((group) => {
      const monthKey = String(group.head.tanggal ?? "").slice(0, 7);
      if (selectedMonth !== "all" && monthKey !== selectedMonth) return false;
      if (!normalizedQuery) return true;
      const searchableText = `${group.key} ${group.rows
        .map((item) =>
          `${item.id} ${item.nama} ${item.jabatan} ${item.tujuan} ${item.keperluan} ${item.jumlah} ${item.cabang}`,
        )
        .join(" ")}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [groups, query, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const pageGroups = useMemo(
    () => filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredGroups, currentPage],
  );
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const totalLines = items.length;
  const uniqueRecipients = new Set(groups.map((group) => group.head.nama)).size;
  const uniqueBranches = new Set(
    items.flatMap((item) =>
      String(item.cabang ?? "")
        .split(",")
        .map((branch) => branch.trim())
        .filter(Boolean),
    ),
  ).size;

  function resetForm() {
    setTujuan("");
    setTanggal(new Date().toISOString().slice(0, 10));
    setLines([{ ...EMPTY_LINE }]);
  }

  function toggleExpand(groupId: string) {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await requestJSON<{ message: string }>("/api/serah-terima", {
        method: "POST",
        body: JSON.stringify({ nama, jabatan, tujuan, tanggal, items: lines.map(({ keperluan, jumlah, cabang }) => ({ keperluan, jumlah, cabang: cabang.join(",") })) }),
      });
      setNotice(""); await notify("Serah terima berhasil disimpan", "success", response.message);
      setModal(false);
      resetForm();
      await load();
    } catch (error) {
      setNotice(""); await notify("Gagal menyimpan serah terima", "error", error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(group: HandoverGroup) {
    if (!admin) return;
    const confirmed = await confirmAction(
      `Hapus dokumen ${group.key}?`,
      `Dokumen ini berisi ${group.rows.length} baris item. Tindakan tidak bisa dibatalkan.`,
      { confirmButtonColor: "#dc2626", confirmButtonText: "Ya, hapus dokumen" },
    );
    if (!confirmed) return;

    try {
      // Endpoint lama menghapus berdasarkan ID baris, jadi hapus semua suffix dalam grup.
      await Promise.all(
        group.rows.map((row) =>
          requestJSON("/api/serah-terima", {
            method: "DELETE",
            body: JSON.stringify({ id: row.id }),
          }),
        ),
      );
      setNotice(""); await notify("Dokumen berhasil dihapus", "success", group.key);
      await load();
    } catch (error) {
      await notify("Gagal menghapus dokumen", "error", error instanceof Error
        ? `${error.message} Sebagian baris mungkin sudah terhapus; muat ulang data untuk memeriksa.`
        : "Terjadi kesalahan.");
      await load();
    }
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["ID Dokumen", "ID Baris", "Tanggal", "Nama", "Jabatan", "Tujuan", "Keperluan", "Jumlah", "Cabang"],
      ...filteredGroups.flatMap((group) =>
        group.rows.map((item) => [
          group.key,
          item.id,
          shortDate(item.tanggal),
          item.nama,
          item.jabatan,
          item.tujuan,
          item.keperluan,
          item.jumlah,
          item.cabang,
        ]),
      ),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rekap-serah-terima.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resolveBranchNames(value: string, abbreviated = false) {
    return String(value ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((code) => {
        // Mengubah kode branch API menjadi string saat perbandingan agar cocok
        const branch = branches.find((b) => String(b.kode_cabang) === code);
        return branch ? (abbreviated ? (branch.singkatan?.trim() || branch.nama_cabang) : branch.nama_cabang) : code;
      });
  }

  async function exportPDF(group: HandoverGroup) {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const item = group.head;
      const { day, dateText } = getDateParts(item.tanggal);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 14;
      const right = pageWidth - 14;

      // Logo YOMART berasal dari public/image, tidak disalin ke folder upload barang.
      try {
        const logo = new Image();
        logo.src = "/image/logoyomart.png";
        await new Promise<void>((resolve, reject) => {
          logo.onload = () => resolve();
          logo.onerror = () => reject(new Error("Logo YOMART tidak dapat dimuat."));
        });
        doc.addImage(logo, "PNG", left, 5, 55, 13);
      } catch {
        // PDF tetap bisa dibuat bila logo tidak tersedia.
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`HARI : ${day}`, left, 23);
      doc.text(`TANGGAL : ${dateText}`, left, 30);
      doc.text("DARI : MARKETING", right - 50, 23);
      doc.text(`UNTUK : ${String(item.tujuan ?? "").toUpperCase()}`, right - 50, 30);

      const body = group.rows.flatMap((row) => {
        const branchNames = resolveBranchNames(row.cabang);
        const locations = branchNames.length ? branchNames : [""];
        return locations.map((branchName, index) => [
          index === 0 ? row.keperluan : "",
          index === 0 ? String(row.jumlah || "").toUpperCase() : "",
          branchName,
        ]);
      });

      // Sisakan tiga baris kosong untuk penambahan alokasi mendadak secara manual.
      // Selalu tambahkan tiga baris kosong, bukan hanya melengkapi jumlah baris menjadi tiga.
      body.push(["", "", ""], ["", "", ""], ["", "", ""]);

      autoTable(doc, {
        startY: 38,
        head: [["Item", "Qty", "Keterangan"]],
        body,
        theme: "grid",
        margin: { left, right: 14, bottom: 12 },
        styles: {
          font: "helvetica",
          fontSize: 9.5,
          textColor: [15, 23, 42],
          lineColor: [20, 20, 20],
          lineWidth: 0.25,
          cellPadding: 2,
          minCellHeight: 7,
          valign: "middle",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: "auto" },
        },
      });

      const finalY =
        (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 65;
      // Posisi tanda tangan dibuat tetap. Bila tabel terlalu panjang, gunakan halaman berikutnya
      // agar jarak tanda tangan dari tepi bawah tidak berubah-ubah.
      if (finalY > pageHeight - 62) doc.addPage();
      const signY = pageHeight - 54;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("MENYERAHKAN", left, signY);
      doc.text("MENERIMA", right - 35, signY);
      doc.setFont("helvetica", "bold");
      doc.text(String(sessionName || "ADMIN MARKETING").toUpperCase(), left, signY + 27);
      doc.setFont("helvetica", "normal");
      doc.text("ADM.MARKETING", tableLeft, signY + 33);

      const safeName = `${group.key}-${item.tujuan}-${dateText}`
        .replace(/[^a-zA-Z0-9 -]/g, "")
        .replace(/\s+/g, "-");
      doc.save(`Serah-Terima-${safeName}.pdf`);
    } catch (error) {
      setNotice("");
      await notify(
        "Gagal membuat PDF",
        "error",
        error instanceof Error ? error.message : "Periksa dependensi PDF dan logo.",
      );
    }
  }

  return (
    <DashboardShell>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Dokumentasi perpindahan barang</div>
          <h1>Serah Terima</h1>
          <p>
            Catatan dikelompokkan menjadi satu dokumen berdasarkan ID induk di
            tb_serah_terima. Setiap huruf suffix menandai baris item di dalam dokumen.
          </p>
        </div>
        <div className="heading-actions">
          <button className="btn" onClick={exportCsv}>
            <Download /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setModal(true);
            }}
          >
            <Plus /> Tambah Serah Terima
          </button>
        </div>
      </div>

      {notice && (
        <div className="toast">
          {notice}
          <button className="float-right" onClick={() => setNotice("")}>
            <X size={13} />
          </button>
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Riwayat serah-terima</div>
            <div className="panel-subtitle">
              Satu baris daftar mewakili satu ID dokumen; seluruh item dalam grup ikut dicetak.
            </div>
          </div>
        </div>
        <div className="panel-body border-b border-slate-100">
          <label className="search-wrap">
            <Search />
            <input
              placeholder="Cari ID dokumen, penerima, tujuan, item, atau cabang…"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }}
            />
          </label>
          <label className="form-group handover-month-filter">
            <span className="form-label">Filter bulan</span>
            <select
              className="select-field"
              value={selectedMonth}
              onChange={(event) => { setSelectedMonth(event.target.value); setCurrentPage(1); }}
            >
              <option value="all">Semua bulan</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
        </div>
        
        {/* Mulai desain card baru dengan fitur expand/meredup */}
        <div className="flex flex-col gap-5 mt-4 p-4 md:p-6 bg-slate-50/50 rounded-b-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Memuat data…</div>
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
              Tidak ada dokumen pada filter yang dipilih.
            </div>
          ) : (
            pageGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.key);
              // Jika item lebih dari 3, sembunyikan sisanya saat tidak di-expand
              const showExpandButton = group.rows.length > 3;
              const visibleRows = isExpanded || !showExpandButton ? group.rows : group.rows.slice(0, 3);

              return (
                <div key={group.key} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition-all hover:shadow-md">
                  
                  {/* Header Card */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-lg font-bold text-slate-800">
                        {shortDate(group.head.tanggal)}
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">Tujuan:</span> 
                        <span className="text-slate-700">{group.head.tujuan}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-xs text-slate-400">ID: {group.key}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {admin && (
                        <button
                          className="px-4 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"
                          onClick={() => remove(group)}
                          title="Hapus Grup"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      )}
                      <button
                        className="px-4 py-1.5 bg-[#10b981] text-white text-sm font-medium rounded-lg hover:bg-[#059669] transition-colors flex items-center gap-1.5"
                        onClick={() => exportPDF(group)}
                        title="Unduh satu PDF untuk seluruh ID dokumen ini"
                      >
                        <FileDown size={14} /> Print PDF
                      </button>
                    </div>
                  </div>

                  {/* Pembungkus Daftar Item dengan relative untuk menaruh gradasi meredup di bawah */}
                  <div className="relative">
                    
                    {/* Header Kolom */}
                    <div className="hidden md:grid md:grid-cols-12 gap-4 border-b border-slate-200 pb-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white">
                      <div className="col-span-5">Keperluan</div>
                      <div className="col-span-2">Jumlah</div>
                      <div className="col-span-5">Cabang</div>
                    </div>

                    {/* Baris Data Item */}
                    <div className={`flex flex-col gap-0 md:gap-0 ${!isExpanded && showExpandButton ? "pb-8" : ""}`}>
                      {visibleRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className={`flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 py-3 md:py-3 text-sm text-slate-700 md:items-center ${idx < visibleRows.length - 1 ? "border-b border-slate-100" : ""}`}
                        >
                          <div className="md:col-span-5">
                            <span className="md:hidden text-xs font-bold text-slate-400 block mb-1">
                              KEPERLUAN:
                            </span>
                            <div className="font-medium text-slate-800 pr-2">{row.keperluan || "-"}</div>
                          </div>
                          
                          <div className="md:col-span-2">
                            <span className="md:hidden text-xs font-bold text-slate-400 block mb-1">
                              JUMLAH:
                            </span>
                            {row.jumlah || "-"}
                          </div>
                          
                          <div className="md:col-span-5">
                            <span className="md:hidden text-xs font-bold text-slate-400 block mb-1">
                              CABANG:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {resolveBranchNames(row.cabang).map((branch, i) => (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium whitespace-nowrap border border-indigo-100"
                                >
                                  {branch}
                                </span>
                              ))}
                              {(!row.cabang || resolveBranchNames(row.cabang).length === 0) && "-"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Efek Gradasi Meredup (Fade out) di bagian bawah jika belum di-expand */}
                    {!isExpanded && showExpandButton && (
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>

                  {/* Tombol Tampilkan Semua / Lebih Sedikit */}
                  {showExpandButton && (
                    <div className="mt-2 flex justify-center border-t border-slate-100 pt-3 relative z-10">
                      <button 
                        onClick={() => toggleExpand(group.key)}
                        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-4 py-1.5 rounded-full hover:bg-indigo-50"
                      >
                        {isExpanded ? (
                          <>Sembunyikan Sebagian <ChevronUp size={16} /></>
                        ) : (
                          <>Lihat {group.rows.length - 3} Item Lainnya <ChevronDown size={16} /></>
                        )}
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
          {!loading && filteredGroups.length > 0 && (
            <div className="handover-pagination">
              <span className="text-xs text-slate-500">
                Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredGroups.length)} dari {filteredGroups.length} dokumen
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Sebelumnya</button>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Halaman {currentPage} / {totalPages}</span>
                <button type="button" className="btn btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Berikutnya</button>
              </div>
            </div>
          )}
        </div>
        {/* Selesai desain card baru */}
      </section>

      {/* Modal Tambah Serah Terima tidak berubah */}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(false);
          }}
        >
          <form className="modal" onSubmit={save}>
            <div className="modal-head">
              <h3>Tambah Serah Terima</h3>
              <button type="button" className="btn btn-sm" onClick={() => setModal(false)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nama penerima / pemohon</label>
                  <input className="field" value={nama} onChange={(event) => setNama(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Jabatan</label>
                  <input className="field" value={jabatan} onChange={(event) => setJabatan(event.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Untuk / nama penerima</label>
                  <input className="field" value={tujuan} onChange={(event) => setTujuan(event.target.value)} required placeholder="Mis. Adrian / nama penerima" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal</label>
                  <input type="date" className="field" value={tanggal} onChange={(event) => setTanggal(event.target.value)} required />
                </div>
              </div>

              <div className="toast" style={{ marginTop: 12, marginBottom: 14 }}>
                Semua baris di bawah ini akan menjadi satu dokumen. ID induk dan akhiran item (a, b, c, …) dibuat otomatis saat disimpan berdasarkan tanggal.
              </div>

              <div className="flex items-center justify-between mb-3 mt-2">
                <div className="panel-title">Daftar keperluan</div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setLines((old) => [...old, { ...EMPTY_LINE }])}
                >
                  <Plus size={13} /> Tambah Baris
                </button>
              </div>

              {lines.map((line, index) => (
                <div className="rounded-xl border border-slate-200 p-3 mb-3" key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">ITEM {index + 1}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      disabled={lines.length === 1}
                      onClick={() => setLines((old) => old.filter((_, lineIndex) => lineIndex !== index))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keperluan / nama barang</label>
                    <input
                      className="field"
                      value={line.keperluan}
                      onChange={(event) =>
                        setLines((old) => old.map((current, lineIndex) =>
                          lineIndex === index ? { ...current, keperluan: event.target.value } : current,
                        ))
                      }
                      placeholder="Contoh: YMC, BALON PROMINA, atau keperluan lain…"
                      required
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Jumlah</label>
                      <input
                        className="field"
                        value={line.jumlah}
                        onChange={(event) =>
                          setLines((old) => old.map((current, lineIndex) =>
                            lineIndex === index ? { ...current, jumlah: event.target.value } : current,
                          ))
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cabang</label>
                      <MultiSearchSelect values={line.cabang} onChange={(values) => setLines(old => old.map((current,lineIndex)=>lineIndex===index?{...current,cabang:values}:current))} placeholder="Cari dan pilih satu atau beberapa cabang…" options={branches.map(branch=>({value:String(branch.kode_cabang),label:branch.nama_cabang,searchText:String(branch.kode_cabang),hint:`Preview kode: ${branch.singkatan?.trim()||branch.kode_cabang}`}))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Serah Terima"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}