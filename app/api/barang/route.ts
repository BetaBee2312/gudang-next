import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";
const PREFIX: Record<string, string> = { Marketing: "MKT", MD: "MD", "Marketing-D53": "MKT-D53", "MD-D53": "MD-D53", "Marketing-DGBG": "MKT-GBG", "MD-DGBG": "MD-GBG" };
const uploadDir = () => path.join(process.cwd(), "public", "gambar");

async function saveImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
  const ext = path.extname(value.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) throw new Error("Format gambar harus JPG, PNG, atau WebP.");
  const filename = `${randomUUID()}${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), filename), Buffer.from(await value.arrayBuffer()));
  return filename;
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = request.nextUrl.searchParams.get("kategori") ?? "";
    const habis = request.nextUrl.searchParams.get("habis") === "1";
    const where: string[] = [];
    const params: any[] = [];
    if (search) { where.push("(nama_barang LIKE ? OR id_barang LIKE ? OR plu LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (category) { where.push("kategori = ?"); params.push(category); }
    if (habis) where.push("qty_terkini <= 0"); else where.push("qty_terkini > 0");
    if (user.division === "MD") where.push("kategori LIKE '%MD%'");
    const sql = `SELECT id_barang, gambar, nama_barang, kategori, expired, qty_awal, qty_terkini, teralokasi, bulan, plu FROM tb_barang_gc WHERE ${where.join(" AND ")} ORDER BY nama_barang ASC`;
    const [rows] = await db.execute<DBRow[]>(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa menambahkan barang.", 403);
  try {
    const form = await request.formData();
    const nama = String(form.get("nama_barang") ?? "").trim();
    const kategori = String(form.get("kategori") ?? "").trim();
    const expiredRaw = String(form.get("expired") ?? "").trim();
    const qtyAwal = Number(form.get("qty_awal") ?? 0);
    const plu = String(form.get("plu") ?? "").trim() || null;
    if (!nama || !kategori || !Number.isInteger(qtyAwal) || qtyAwal < 0) return fail("Nama, kategori, dan jumlah stok harus valid.");
    const [last] = await db.execute<DBRow[]>("SELECT id_barang FROM tb_barang_gc WHERE kategori = ? ORDER BY id_barang DESC LIMIT 1", [kategori]);
    const lastId = String(last[0]?.id_barang ?? "");
    const match = lastId.match(/-(\d+)$/);
    const number = (match ? Number(match[1]) : 0) + 1;
    const id = `${PREFIX[kategori] ?? "OTH"}-${String(number).padStart(3, "0")}`;
    const image = await saveImage(form.get("gambar"));
    const bulan = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date());
    await db.execute(
      "INSERT INTO tb_barang_gc (id_barang, gambar, nama_barang, kategori, expired, qty_awal, qty_terkini, teralokasi, bulan, plu) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
      [id, image, nama, kategori, expiredRaw || null, qtyAwal, qtyAwal, bulan, plu],
    );
    return NextResponse.json({ success: true, message: "Barang berhasil ditambahkan.", id_barang: id }, { status: 201 });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa mengedit barang.", 403);
  try {
    const body = await request.json();
    const id = String(body.id_barang ?? "").trim();
    if (!id) return fail("ID barang tidak valid.");
    const fields: Record<string, string | number | null> = {};
    for (const key of ["nama_barang", "kategori"] as const) {
      if (Object.hasOwn(body, key)) fields[key] = String(body[key] ?? "").trim();
    }
    for (const key of ["expired", "plu", "gambar"] as const) {
      if (Object.hasOwn(body, key)) fields[key] = body[key] == null || String(body[key]).trim() === "" ? null : String(body[key]).trim();
    }
    for (const key of ["qty_awal", "qty_terkini", "teralokasi"] as const) {
      if (Object.hasOwn(body, key)) {
        const quantity = Number(body[key]);
        if (!Number.isInteger(quantity) || quantity < 0) return fail(`${key} harus bilangan bulat nol atau lebih.`);
        fields[key] = quantity;
      }
    }
    if (("nama_barang" in fields && !String(fields.nama_barang ?? "").trim()) || ("kategori" in fields && !String(fields.kategori ?? "").trim())) return fail("Nama barang dan kategori tidak boleh kosong.");
    const allowed = Object.keys(fields);
    if (!allowed.length) return fail("Tidak ada field yang diubah.");
    await db.execute(`UPDATE tb_barang_gc SET ${allowed.map(k => `${k} = ?`).join(", ")} WHERE id_barang = ?`, [...allowed.map(k => fields[k]), id]);
    return NextResponse.json({ success: true, message: "Barang berhasil diperbarui." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa menghapus barang.", 403);
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((v: unknown) => String(v).trim()).filter(Boolean) : [String(body.id_barang ?? "").trim()].filter(Boolean);
    if (!ids.length) return fail("Pilih barang yang ingin dihapus.");
    const [images] = await db.execute<DBRow[]>(`SELECT gambar FROM tb_barang_gc WHERE id_barang IN (${ids.map(() => "?").join(",")})`, ids);
    await db.execute(`DELETE FROM tb_barang_gc WHERE id_barang IN (${ids.map(() => "?").join(",")})`, ids);
    for (const row of images) {
      if (row.gambar) {
        try { await unlink(path.join(uploadDir(), path.basename(String(row.gambar)))); } catch { /* Foto yang sudah hilang tidak menggagalkan hapus data. */ }
      }
    }
    return NextResponse.json({ success: true, message: `${ids.length} barang dihapus.` });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
