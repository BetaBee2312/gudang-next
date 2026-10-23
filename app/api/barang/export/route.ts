import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, type DBRow } from "@/lib/db";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";
const allowedCategories = ["marketing", "md", "marketing-d53", "md-d53", "marketing-dgbg", "md-dgbg"];
const mdCategories = ["md", "md-d53", "md-dgbg"];

function parseExcelDate(value: unknown): Date | "" {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value).trim();
  const isoDate = raw.slice(0, 10);
  const parts = isoDate.split("-").map(Number);
  if (
    parts.length === 3 &&
    isoDate.length === 10 &&
    parts.every(Number.isInteger) &&
    parts[0] >= 1900 &&
    parts[1] >= 1 && parts[1] <= 12 &&
    parts[2] >= 1 && parts[2] <= 31
  ) {
    const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
    if (parsed.getFullYear() === parts[0] && parsed.getMonth() === parts[1] - 1 && parsed.getDate() === parts[2]) {
      return parsed;
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? "" : fallback;
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    const selectedMonth = request.nextUrl.searchParams.get("bulan") ?? "";
    const [yearRaw, monthRaw] = selectedMonth.split("-");
    const year = /^\d{4}$/.test(yearRaw ?? "") ? Number(yearRaw) : new Date().getFullYear();
    const month = /^\d{1,2}$/.test(monthRaw ?? "") && Number(monthRaw) >= 1 && Number(monthRaw) <= 12 ? Number(monthRaw) : new Date().getMonth() + 1;
    const requestedFilter = (request.nextUrl.searchParams.get("filter") ?? "").toLowerCase();
    const requestedScope = (request.nextUrl.searchParams.get("scope") ?? "").toLowerCase();
    const scopeMD = requestedScope === "md" || user.division.toLowerCase() === "md";
    let categoryFilter = allowedCategories.includes(requestedFilter) ? requestedFilter : "";
    if (scopeMD && categoryFilter && !mdCategories.includes(categoryFilter)) categoryFilter = "";
    const categoryWhere = categoryFilter ? " AND LOWER(b.kategori) = ?" : scopeMD ? ` AND LOWER(b.kategori) IN (${mdCategories.map(() => "?").join(",")})` : "";
    const categoryParams: string[] = categoryFilter ? [categoryFilter] : scopeMD ? [...mdCategories] : [];

    const [branchRows] = await db.execute<DBRow[]>(
      `SELECT DISTINCT c.nama_cabang FROM tb_list_alokasi a LEFT JOIN tb_cabang c ON a.kode_cabang = c.kode_cabang LEFT JOIN tb_barang_gc b ON a.id_barang = b.id_barang WHERE c.nama_cabang IS NOT NULL AND MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?${categoryWhere} ORDER BY c.nama_cabang ASC`,
      [month, year, ...categoryParams],
    );
    const branches = branchRows.map(r => String(r.nama_cabang));
    const [allocationRows] = await db.execute<DBRow[]>(
      `SELECT a.id_barang, c.nama_cabang, SUM(a.qty_teralokasi) AS total FROM tb_list_alokasi a LEFT JOIN tb_cabang c ON a.kode_cabang = c.kode_cabang LEFT JOIN tb_barang_gc b ON a.id_barang = b.id_barang WHERE MONTH(a.tanggal) = ? AND YEAR(a.tanggal) = ?${categoryWhere} GROUP BY a.id_barang, c.nama_cabang`,
      [month, year, ...categoryParams],
    );
    const allocationMap = new Map<string, number>();
    for (const r of allocationRows) allocationMap.set(`${String(r.id_barang)}\u0000${String(r.nama_cabang)}`, Number(r.total ?? 0));

    let itemWhere = ""; let itemParams: string[] = [];
    if (categoryFilter) { itemWhere = " WHERE LOWER(kategori) = ?"; itemParams = [categoryFilter]; }
    else if (scopeMD) { itemWhere = ` WHERE LOWER(kategori) IN (${mdCategories.map(() => "?").join(",")})`; itemParams = [...mdCategories]; }
    const [items] = await db.execute<DBRow[]>(`SELECT id_barang, nama_barang, kategori, expired, qty_awal, qty_terkini, gambar, plu FROM tb_barang_gc${itemWhere} ORDER BY nama_barang ASC`, itemParams);

    const wb = new ExcelJS.Workbook(); wb.creator = "Gudang Marketing"; wb.created = new Date();
    const ws = wb.addWorksheet(`Alokasi ${String(month).padStart(2, "0")}-${year}`, { views: [{ state: "frozen", ySplit: 1, xSplit: 4 }] });
    const headers = ["No", "PLU", "Gambar", "Nama Barang", "Kategori", "Exp", "Stok Awal", "Stok Akhir", ...branches];
    ws.addRow(headers); ws.getRow(1).height = 36;
    ws.columns = [
      { width: 5 }, { width: 12 }, { width: 12 }, { width: 30 }, { width: 16 }, { width: 14 }, { width: 10 }, { width: 10 }, ...branches.map(() => ({ width: 14 })),
    ];
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF183C34" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F2F29" } },
        left: { style: "thin", color: { argb: "FF54776D" } },
        bottom: { style: "medium", color: { argb: "FFD8F26B" } },
        right: { style: "thin", color: { argb: "FF54776D" } },
      };
    });
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const row = ws.addRow([
        index + 1, (item.plu == null || String(item.plu).trim() === "" || Number(item.plu) === 0) ? "" : item.plu, "", item.nama_barang, item.kategori,
        parseExcelDate(item.expired),
        Number(item.qty_awal ?? 0), Number(item.qty_terkini ?? 0),
        ...branches.map(branch => { const value = allocationMap.get(`${String(item.id_barang)}\u0000${branch}`) ?? 0; return value > 0 ? value : ""; }),
      ]);
      row.height = 38; row.alignment = { vertical: "middle", wrapText: true };
      row.eachCell((cell, col) => {
        if (row.number % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8F5" } };
        if (col === 1 || col === 7 || col === 8 || col >= 9) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (col === 6 && cell.value instanceof Date) cell.numFmt = "dd mmm yyyy";
        if (col >= 9) cell.numFmt = "#,##0";
        cell.border = {
          top: { style: "thin", color: { argb: "FFD7E0DA" } },
          left: { style: "thin", color: { argb: "FFD7E0DA" } },
          bottom: { style: "thin", color: { argb: "FFD7E0DA" } },
          right: { style: "thin", color: { argb: "FFD7E0DA" } },
        };
      });
      if (item.gambar) {
        try {
          const filename = path.basename(String(item.gambar));
          const imagePaths = [
            path.join(process.cwd(), "public", "gambar", filename),
            path.join(process.cwd(), "public", "image", filename),
            path.join(process.cwd(), "public", filename),
          ];
          let source: Buffer | undefined;
          for (const imagePath of imagePaths) {
            try {
              source = await readFile(imagePath);
              break;
            } catch {
              // Try the next supported legacy upload location.
            }
          }
          if (source) {
            const compressed = await sharp(source, { limitInputPixels: 40_000_000 })
              .rotate()
              .flatten({ background: "#FFFFFF" })
              .resize({ width: 150, height: 100, fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 32, mozjpeg: true, progressive: true, chromaSubsampling: "4:2:0" })
              .toBuffer();

            const imageId = wb.addImage({ buffer: compressed as unknown as Buffer, extension: "jpeg" });
            // Fixed thumbnail inside column C. oneCell anchoring makes it move with its row when rows are deleted.
            ws.addImage(imageId, ({
              tl: { col: 2.12, row: row.number - 0.9 },
              br: { col: 2.88, row: row.number - 0.1 },
              editAs: "twoCell",
            }) as Parameters<typeof ws.addImage>[1]);
            });
          }
        } catch {
          // Continue export if an old image is missing or cannot be decoded.
        }
      }
    }
    ws.autoFilter = { from: "A1", to: `${ws.getColumn(ws.columnCount).letter}${Math.max(1, items.length + 1)}` };
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    ws.headerFooter.oddFooter = `&BGudang Marketing  •  ${String(month).padStart(2, "0")}/${year}  •  Halaman &P dari &N`;
    const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
    return new NextResponse(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="rekap-alokasi-${year}-${String(month).padStart(2, "0")}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof Error ? error.message : "Gagal membuat file Excel.", 500); }
}
