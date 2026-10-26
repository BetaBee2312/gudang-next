import { NextRequest, NextResponse } from "next/server";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

function isMDDivision(value: string) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return ["md", "md-ho", "md-d53", "md-dgbg"].includes(key);
}

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (isMDDivision(user.division)) return fail("Divisi MD tidak memiliki akses ke modul serah-terima.", 403);
  try {
    const [rows] = await db.execute<DBRow[]>("SELECT id, nama, jabatan, tujuan, tanggal, keperluan, jumlah, cabang FROM tb_serah_terima ORDER BY tanggal DESC, id ASC LIMIT 1500");
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (isMDDivision(user.division)) return fail("Divisi MD tidak memiliki akses ke modul serah-terima.", 403);
  try {
    const body = await request.json();
    const nama = String(body.nama ?? user.nama ?? "").trim(); const jabatan = String(body.jabatan ?? user.jabatan ?? "").trim();
    const tujuan = String(body.tujuan ?? "").trim(); const tanggal = String(body.tanggal ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!nama || !jabatan || !tujuan || !tanggal || !items.length) return fail("Nama, jabatan, tujuan, tanggal, dan minimal satu keperluan wajib diisi.");
    if (items.some((x: Record<string, unknown>) => !String(x.keperluan ?? "").trim() || !String(x.jumlah ?? "").trim())) return fail("Deskripsi keperluan dan jumlah tidak boleh kosong.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(`${tanggal}T00:00:00`))) return fail("Tanggal tidak valid.");
    if (items.some((x: Record<string, unknown>) => {
      const codes: unknown[] = Array.isArray(x.cabang) ? x.cabang : String(x.cabang ?? "").split(",");
      return codes.some((code) => String(code).trim().length > 64);
    })) return fail("Ada kode cabang yang tidak valid.");
    if (items.length > 100) return fail("Maksimal 100 baris untuk satu dokumen serah-terima.");
    let conn;
    try {
      conn = await db.getConnection(); await conn.beginTransaction();
      const [dateYear, dateMonth, dateDay] = tanggal.split("-");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error("Tanggal tidak valid.");
      const datePrefix = `${dateYear}${dateMonth}${dateDay}`;
      const [found] = await conn.execute<DBRow[]>("SELECT id FROM tb_serah_terima WHERE id LIKE ? FOR UPDATE", [`${datePrefix}-%`]);
      let maxNum = 0;
      for (const row of found) { const m = String(row.id).match(/-(\d+)[a-z]$/); if (m) maxNum = Math.max(maxNum, Number(m[1])); }
      let number = maxNum + 1; let charCode = 97;
      for (const item of items) {
        const id = `${datePrefix}-${String(number).padStart(3, "0")}${String.fromCharCode(charCode)}`;
        const rawBranches = Array.isArray(item.cabang) ? item.cabang : String(item.cabang ?? "").split(",");
        const branchCodes: string[] = Array.from(new Set<string>(rawBranches.map((value: unknown) => String(value).trim()).filter((value: string) => Boolean(value))));
        if (branchCodes.length) {
          const [branchRows] = await conn.execute<DBRow[]>(`SELECT kode_cabang FROM tb_cabang WHERE kode_cabang IN (${branchCodes.map(() => "?").join(",")})`, branchCodes);
          if (branchRows.length !== branchCodes.length) throw new Error("Satu atau beberapa cabang yang dipilih tidak ditemukan.");
        }
        await conn.execute("INSERT INTO tb_serah_terima (id, nama, jabatan, tujuan, tanggal, keperluan, jumlah, cabang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [id, nama, jabatan, tujuan, tanggal, String(item.keperluan).trim(), String(item.jumlah ?? "").trim(), branchCodes.join(",")]);
        charCode++;
        if (charCode > 122) { charCode = 97; number++; }
      }
      await conn.commit();
      return NextResponse.json({ success: true, message: `${items.length} baris serah-terima disimpan.` }, { status: 201 });
    } catch (error) { if (conn) await conn.rollback(); throw error; }
    finally { conn?.release(); }
  } catch (error) { return fail(databaseErrorMessage(error), 400); }
}
export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (isMDDivision(user.division)) return fail("Divisi MD tidak memiliki akses ke modul serah-terima.", 403);
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa menghapus serah-terima.", 403);
  try {
    const body = await request.json(); const id = String(body.id ?? "").trim();
    if (!id) return fail("ID serah-terima tidak valid.");
    await db.execute("DELETE FROM tb_serah_terima WHERE id = ?", [id]);
    return NextResponse.json({ success: true, message: "Catatan serah-terima dihapus." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
