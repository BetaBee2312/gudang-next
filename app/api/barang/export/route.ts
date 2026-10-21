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
    ws.addRow(headers); ws.getRow(1).height = 30;
    ws.columns = [
      { width: 7 }, { width: 15 }, { width: 12 }, { width: 34 }, { width: 19 }, { width: 16 }, { width: 12 }, { width: 12 }, ...branches.map(() => ({ width: 17 })),
    ];
    ws.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF183C34" } }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { bottom: { style: "medium", color: { argb: "FFD8F26B" } } }; });
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const row = ws.addRow([
        index + 1, item.plu ?? "", "", item.nama_barang, item.kategori,
        item.expired ? new Date(`${String(item.expired).slice(0, 10)}T00:00:00`) : "",
        Number(item.qty_awal ?? 0), Number(item.qty_terkini ?? 0),
        ...branches.map(branch => { const value = allocationMap.get(`${String(item.id_barang)}\u0000${branch}`) ?? 0; return value > 0 ? value : ""; }),
      ]);
      row.height = 48; row.alignment = { vertical: "middle", wrapText: true };
      row.eachCell((cell, col) => {
        if (row.number % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8F5" } };
        if (col === 1 || col === 7 || col === 8 || col >= 9) cell.alignment = { horizontal: "center", vertical: "middle" };
        if (col === 6 && cell.value instanceof Date) cell.numFmt = "dd mmm yyyy";
        if (col >= 9) cell.numFmt = "#,##0";
        cell.border = { bottom: { style: "hair", color: { argb: "FFE5EBE6" } } };
      });
      if (item.gambar) {
        try {
          const imagePath = path.join(process.cwd(), "public", "gambar", path.basename(String(item.gambar)));
          const source = await readFile(imagePath);
          // Workbook uses lightweight thumbnails instead of embedding original full-resolution photos.
          const compressed = await sharp(source, { limitInputPixels: 40_000_000 })
            .rotate()
            .flatten({ background: "#FFFFFF" })
            .resize({ width: 180, height: 140, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 35, mozjpeg: true, progressive: true, chromaSubsampling: "4:2:0" })
            .toBuffer();

          const imageId = wb.addImage({ buffer: compressed, extension: "jpeg" });
          // Anchor the image to column C and the item's row; twoCell makes it move/resize with cells in Excel.
          ws.addImage(imageId, {
            tl: { col: 2, row: row.number - 1 },
            br: { col: 3, row: row.number },
            editAs: "twoCell",
          });
        } catch {
          // Continue export if an old image is missing or cannot be decoded.
        }
      }    }
    ws.autoFilter = { from: "A1", to: `${ws.getColumn(ws.columnCount).letter}${Math.max(1, items.length + 1)}` };
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    ws.headerFooter.oddFooter = `&BGudang Marketing  •  ${String(month).padStart(2, "0")}/${year}  •  Halaman &P dari &N`;
    const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
    return new NextResponse(bytes, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="rekap-alokasi-${year}-${String(month).padStart(2, "0")}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error) { return fail(error instanceof Error ? error.message : "Gagal membuat file Excel.", 500); }
}
