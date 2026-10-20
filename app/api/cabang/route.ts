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
    const b = await request.json();
    const kode = String(b.kode_cabang ?? "").trim(); const nama = String(b.nama_cabang ?? "").trim();
    const singkatan = String(b.singkatan ?? "").trim(); const dc = String(b.dc_support ?? "").trim();
    if (!kode || !nama) return fail("Kode dan nama cabang wajib diisi.");
    await db.execute("INSERT INTO tb_cabang (kode_cabang, nama_cabang, singkatan, dc_support) VALUES (?, ?, ?, ?)", [kode, nama, singkatan, dc]);
    return NextResponse.json({ success: true, message: "Cabang ditambahkan." }, { status: 201 });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const b = await request.json(); const kode = String(b.kode_cabang ?? "").trim();
    if (!kode) return fail("Kode cabang tidak valid.");
    await db.execute("UPDATE tb_cabang SET nama_cabang = ?, singkatan = ?, dc_support = ? WHERE kode_cabang = ?", [String(b.nama_cabang ?? "").trim(), String(b.singkatan ?? "").trim(), String(b.dc_support ?? "").trim(), kode]);
    return NextResponse.json({ success: true, message: "Cabang diperbarui." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
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
