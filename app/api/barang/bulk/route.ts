import { NextRequest, NextResponse } from "next/server";
import { db, databaseErrorMessage } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa mengedit massal.", 403);
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return fail("Tidak ada barang yang dikirim untuk diperbarui.");
  let conn;
  let updated = 0;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
    for (const item of items) {
      const id = String(item.id_barang ?? "").trim();
      const name = String(item.nama_barang ?? "").trim();
      const category = String(item.kategori ?? "").trim();
      const qtyInitial = Number(item.qty_awal);
      const qtyCurrent = Number(item.qty_terkini);
      const plu = String(item.plu ?? "").trim() || null;
      const expired = String(item.expired ?? "").trim() || null;
      if (!id || !name || !category || !Number.isInteger(qtyInitial) || qtyInitial < 0 || !Number.isInteger(qtyCurrent) || qtyCurrent < 0) {
        throw new Error(`Data barang ${id || "tanpa ID"} tidak valid.`);
      }
      await conn.execute("UPDATE tb_barang_gc SET nama_barang = ?, kategori = ?, expired = ?, qty_awal = ?, qty_terkini = ?, bulan = ?, plu = ? WHERE id_barang = ?", [name, category, expired, qtyInitial, qtyCurrent, month, plu, id]);
      updated++;
    }
    await conn.commit();
    return NextResponse.json({ success: true, message: `${updated} data barang berhasil diperbarui.` });
  } catch (error) {
    if (conn) await conn.rollback();
    return fail(databaseErrorMessage(error), 400);
  } finally { conn?.release(); }
}
