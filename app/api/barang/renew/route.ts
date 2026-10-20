import { NextRequest, NextResponse } from "next/server";
import { db, databaseErrorMessage } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa melakukan rollover bulanan.", 403);
  const body = await request.json().catch(() => ({}));
  const requestedMonth = String(body.bulan ?? "").trim();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  let monthIndex = months.indexOf(requestedMonth);
  if (monthIndex < 0) monthIndex = new Date().getMonth();
  const nextMonth = months[(monthIndex + 1) % 12];
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    await conn.execute("INSERT INTO tb_barang_arsip (id_barang, nama_barang, kategori, expired, qty_awal, qty_terkini, teralokasi, bulan) SELECT id_barang, nama_barang, kategori, expired, qty_awal, qty_terkini, teralokasi, bulan FROM tb_barang_gc");
    await conn.execute("UPDATE tb_barang_gc SET bulan = ?, qty_awal = qty_terkini, teralokasi = 0", [nextMonth]);
    await conn.commit();
    return NextResponse.json({ success: true, message: `Stok diarsipkan dan bulan aktif diperbarui menjadi ${nextMonth}.` });
  } catch (error) {
    if (conn) await conn.rollback();
    return fail(databaseErrorMessage(error), 500);
  } finally { conn?.release(); }
}
