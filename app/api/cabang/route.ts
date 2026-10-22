import { NextRequest, NextResponse } from "next/server";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { requireUser, requireAdmin, isResponse, fail } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    const [rows] = await db.execute<DBRow[]>("SELECT kode_cabang, nama_cabang, singkatan, dc_support FROM tb_cabang ORDER BY nama_cabang ASC");
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [body];
    if (!rows.length || rows.length > 1000) return fail("Jumlah cabang harus antara 1 sampai 1000.");
    const normalized = rows.map((row: Record<string, unknown>) => ({
      kode: String(row.kode_cabang ?? "").trim(),
      nama: String(row.nama_cabang ?? "").trim(),
      singkatan: String(row.singkatan ?? "").trim(),
      dc: String(row.dc_support ?? "").trim(),
      cluster: String(row.cluster ?? "").trim(),
    }));
    if (normalized.some(row => !row.kode || !row.nama)) return fail("Setiap cabang wajib memiliki kode_cabang dan nama_cabang.");
    if (new Set(normalized.map(row => row.kode)).size !== normalized.length) return fail("Ada kode cabang duplikat dalam data yang dikirim.");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const row of normalized) {
        await conn.execute("INSERT INTO tb_cabang (kode_cabang, nama_cabang, singkatan, dc_support, cluster) VALUES (?, ?, ?, ?, ?)", [row.kode, row.nama, row.singkatan, row.dc, row.cluster]);
      }
      await conn.commit();
      return NextResponse.json({ success: true, message: `${normalized.length} cabang berhasil ditambahkan.` }, { status: 201 });
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  } catch (error) { return fail(databaseErrorMessage(error), 400); }
}
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [body];
    if (!rows.length || rows.length > 1000) return fail("Jumlah cabang harus antara 1 sampai 1000.");
    const normalized = rows.map((row: Record<string, unknown>) => ({
      kode: String(row.kode_cabang ?? "").trim(),
      nama: String(row.nama_cabang ?? "").trim(),
      singkatan: String(row.singkatan ?? "").trim(),
      dc: String(row.dc_support ?? "").trim(),
      cluster: String(row.cluster ?? "").trim(),
    }));
    if (normalized.some(row => !row.kode || !row.nama)) return fail("Setiap cabang wajib memiliki kode_cabang dan nama_cabang.");
    if (new Set(normalized.map(row => row.kode)).size !== normalized.length) return fail("Ada kode cabang duplikat dalam data yang dikirim.");
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const row of normalized) {
        const [result] = await conn.execute("UPDATE tb_cabang SET nama_cabang = ?, singkatan = ?, dc_support = ?, cluster = ? WHERE kode_cabang = ?", [row.nama, row.singkatan, row.dc, row.cluster, row.kode]);
        if ("affectedRows" in result && Number(result.affectedRows) === 0) {
          const [exists] = await conn.execute<DBRow[]>("SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ?", [row.kode]);
          if (!exists.length) throw new Error(`Kode cabang ${row.kode} tidak ditemukan.`);
        }
      }
      await conn.commit();
      return NextResponse.json({ success: true, message: `${normalized.length} cabang berhasil diperbarui.` });
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  } catch (error) { return fail(databaseErrorMessage(error), 400); }
}
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const b = await request.json(); const kode = String(b.kode_cabang ?? "").trim();
    if (!kode) return fail("Kode cabang tidak valid.");
    const [count] = await db.execute<DBRow[]>("SELECT COUNT(*) AS total FROM tb_list_alokasi WHERE kode_cabang = ?", [kode]);
    if (Number(count[0]?.total ?? 0) > 0) return fail("Cabang masih memiliki riwayat alokasi dan tidak bisa dihapus.", 409);
    await db.execute("DELETE FROM tb_cabang WHERE kode_cabang = ?", [kode]);
    return NextResponse.json({ success: true, message: "Cabang dihapus." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
