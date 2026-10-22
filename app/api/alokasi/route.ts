import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.division.toLowerCase() === "md") return fail("Divisi MD tidak memiliki akses ke modul alokasi.", 403);
  try {
    const status = request.nextUrl.searchParams.get("status") ?? "";
    const where: string[] = []; const values: string[] = [];
    if (status) { where.push("a.status LIKE ?"); values.push(`%${status}%`); }
    const sql = `SELECT a.id_alokasi, a.id_barang, b.nama_barang, a.qty_teralokasi, a.nama_pemohon, a.status, a.tanggal, a.kode_cabang, c.nama_cabang FROM tb_list_alokasi a LEFT JOIN tb_barang_gc b ON b.id_barang = a.id_barang LEFT JOIN tb_cabang c ON c.kode_cabang = a.kode_cabang ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.tanggal DESC, a.id_alokasi DESC LIMIT 1000`;
    const [rows] = await db.execute<DBRow[]>(sql, values);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.division.toLowerCase() === "md") return fail("Divisi MD tidak memiliki akses ke modul alokasi.", 403);
  try {
    const body = await request.json();
    const pemohon = String(body.nama_pemohon ?? user.nama ?? "").trim();
    const kodeCabang = String(body.kode_cabang ?? "").trim();
    const items = Array.isArray(body.items) ? body.items : [{ id_barang: body.id_barang, qty: body.qty }];
    if (!pemohon || !kodeCabang || !items.length) return fail("Pemohon, cabang, dan minimal satu barang wajib dipilih.");
    let conn;
    try {
      conn = await db.getConnection(); await conn.beginTransaction();
      const now = new Date();
      const jakarta = new Date(now.getTime() + (7 * 60 - now.getTimezoneOffset()) * 60000);
      const datePrefix = `${jakarta.getUTCFullYear()}${String(jakarta.getUTCMonth() + 1).padStart(2, "0")}${String(jakarta.getUTCDate()).padStart(2, "0")}`;
      const [lastRows] = await conn.execute<DBRow[]>("SELECT id_alokasi FROM tb_list_alokasi WHERE id_alokasi LIKE ? ORDER BY id_alokasi DESC LIMIT 1 FOR UPDATE", [`${datePrefix}%`]);
      let sequence = Number(String(lastRows[0]?.id_alokasi ?? "").slice(8, 11)) + 1;
      if (!Number.isFinite(sequence) || sequence < 1) sequence = 1;
      const ids: string[] = [];
      for (const raw of items) {
        const idBarang = String(raw.id_barang ?? "").trim(); const qty = Number(raw.qty ?? raw.qty_teralokasi ?? 0);
        if (!idBarang || !Number.isInteger(qty) || qty <= 0) throw new Error("Barang atau jumlah alokasi tidak valid.");
        const [productRows] = await conn.execute<DBRow[]>("SELECT nama_barang, qty_terkini FROM tb_barang_gc WHERE id_barang = ? FOR UPDATE", [idBarang]);
        const product = productRows[0];
        if (!product) throw new Error(`Barang ${idBarang} tidak ditemukan.`);
        const available = Number(product.qty_terkini ?? 0);
        if (available < qty) throw new Error(`Stok ${String(product.nama_barang)} tidak cukup. Tersedia ${available}, diminta ${qty}.`);
        const id = `${datePrefix}${String(sequence++).padStart(3, "0")}${String(Date.now()).slice(-3)}${randomInt(0, 10)}`;
        await conn.execute("INSERT INTO tb_list_alokasi (id_alokasi, id_barang, qty_teralokasi, nama_pemohon, status, tanggal, kode_cabang) VALUES (?, ?, ?, ?, 'pending', NOW(), ?)", [id, idBarang, qty, pemohon, kodeCabang]);
        await conn.execute("UPDATE tb_barang_gc SET qty_terkini = qty_terkini - ?, teralokasi = teralokasi + ? WHERE id_barang = ?", [qty, qty, idBarang]);
        ids.push(id);
      }
      await conn.commit();
      return NextResponse.json({ success: true, message: `${ids.length} item dialokasikan dengan status pending.`, ids }, { status: 201 });
    } catch (error) { if (conn) await conn.rollback(); throw error; }
    finally { conn?.release(); }
  } catch (error) { return fail(databaseErrorMessage(error), 400); }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.division.toLowerCase() === "md") return fail("Divisi MD tidak memiliki akses ke modul alokasi.", 403);
  if (!isAdmin(user)) return fail("Aksi ini hanya untuk Admin atau Creator.", 403);
  const body = await request.json();
  const id = String(body.id_alokasi ?? "").trim(); const action = String(body.action ?? "").trim();
  if (!id || !["approve", "reject"].includes(action)) return fail("Aksi alokasi tidak valid.");
  let conn;
  try {
    conn = await db.getConnection(); await conn.beginTransaction();
    const [rows] = await conn.execute<DBRow[]>("SELECT id_alokasi, id_barang, qty_teralokasi, status FROM tb_list_alokasi WHERE id_alokasi = ? FOR UPDATE", [id]);
    if (!rows.length) throw new Error("Data alokasi tidak ditemukan.");
    if (action === "reject") {
      for (const row of rows) {
        const currentStatus = String(row.status ?? "").toLowerCase();
        if (currentStatus === "pending") {
          await conn.execute("UPDATE tb_barang_gc SET qty_terkini = qty_terkini + ?, teralokasi = GREATEST(0, teralokasi - ?) WHERE id_barang = ?", [Number(row.qty_teralokasi), Number(row.qty_teralokasi), String(row.id_barang)]);
        }
      }
    }
    const status = action === "approve" ? `Approved by ${user.nama || user.no_karyawan}` : `Rejected by ${user.nama || user.no_karyawan}`;
    await conn.execute("UPDATE tb_list_alokasi SET status = ? WHERE id_alokasi = ? AND status = 'pending'", [status, id]);
    await conn.commit();
    return NextResponse.json({ success: true, message: action === "approve" ? "Alokasi dikonfirmasi." : "Alokasi ditolak dan stok pending dikembalikan." });
  } catch (error) { if (conn) await conn.rollback(); return fail(databaseErrorMessage(error), 400); }
  finally { conn?.release(); }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.division.toLowerCase() === "md") return fail("Divisi MD tidak memiliki akses ke modul alokasi.", 403);
  if (!isAdmin(user)) return fail("Aksi ini hanya untuk Admin atau Creator.", 403);
  const body = await request.json(); const id = String(body.id_alokasi ?? "").trim();
  if (!id) return fail("ID alokasi tidak valid.");
  let conn;
  try {
    conn = await db.getConnection(); await conn.beginTransaction();
    const [rows] = await conn.execute<DBRow[]>("SELECT id_barang, qty_teralokasi, status FROM tb_list_alokasi WHERE id_alokasi = ? FOR UPDATE", [id]);
    const row = rows[0];
    if (!row) throw new Error("Alokasi tidak ditemukan.");
    if (String(row.status).toLowerCase() === "pending") {
      await conn.execute("UPDATE tb_barang_gc SET qty_terkini = qty_terkini + ?, teralokasi = GREATEST(0, teralokasi - ?) WHERE id_barang = ?", [Number(row.qty_teralokasi), Number(row.qty_teralokasi), String(row.id_barang)]);
    }
    await conn.execute("DELETE FROM tb_list_alokasi WHERE id_alokasi = ?", [id]);
    await conn.commit();
    return NextResponse.json({ success: true, message: "Alokasi dihapus." });
  } catch (error) { if (conn) await conn.rollback(); return fail(databaseErrorMessage(error), 400); }
  finally { conn?.release(); }
}
