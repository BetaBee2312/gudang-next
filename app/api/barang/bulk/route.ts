import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";

const uploadDir = () => path.join(process.cwd(), "public", "gambar");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type BulkItem = {
  id_barang?: unknown;
  nama_barang?: unknown;
  kategori?: unknown;
  expired?: unknown;
  qty_awal?: unknown;
  qty_terkini?: unknown;
  plu?: unknown;
};

type NormalizedItem = {
  id: string;
  name: string;
  category: string;
  qtyInitial: number;
  qtyCurrent: number;
  plu: string | null;
  expired: string | null;
};

async function saveImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_IMAGE_SIZE) throw new Error(`Foto ${value.name}: ukuran maksimal 5 MB.`);

  const ext = path.extname(value.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Foto ${value.name}: format harus JPG, PNG, atau WebP.`);
  }

  const filename = `${randomUUID()}${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), filename), Buffer.from(await value.arrayBuffer()), { flag: "wx" });
  return filename;
}

async function removeImage(filename: unknown) {
  if (!filename) return;
  try {
    await unlink(path.join(uploadDir(), path.basename(String(filename))));
  } catch {
    // Foto yang sudah tidak ada tidak menggagalkan proses.
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) return fail("Hanya Admin atau Creator yang bisa mengedit massal.", 403);

  let form: FormData;
  let rawItems: unknown;
  try {
    form = await request.formData();
    const raw = form.get("items");
    if (typeof raw !== "string") return fail("Data barang tidak ditemukan.");
    rawItems = JSON.parse(raw);
  } catch {
    return fail("Form edit massal tidak valid. Muat ulang halaman lalu coba lagi.");
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return fail("Tidak ada barang yang dikirim untuk diperbarui.");
  }
  if (rawItems.length > 500) return fail("Maksimal 500 barang dapat diperbarui dalam satu proses.");

  const normalized: NormalizedItem[] = [];
  for (const item of rawItems as BulkItem[]) {
    const id = String(item.id_barang ?? "").trim();
    const name = String(item.nama_barang ?? "").trim();
    const category = String(item.kategori ?? "").trim();
    const qtyInitial = Number(item.qty_awal);
    const qtyCurrent = Number(item.qty_terkini);
    const plu = String(item.plu ?? "").trim() || null;
    const expiredValue = String(item.expired ?? "").trim();
    const expired = expiredValue || null;

    if (!id || !name || !category || !Number.isInteger(qtyInitial) || qtyInitial < 0 ||
        !Number.isInteger(qtyCurrent) || qtyCurrent < 0) {
      return fail(`Data barang ${id || "tanpa ID"} tidak valid.`);
    }
    if (expired && !/^\d{4}-\d{2}-\d{2}$/.test(expired)) {
      return fail(`Tanggal expired barang ${id} tidak valid.`);
    }

    normalized.push({ id, name, category, qtyInitial, qtyCurrent, plu, expired });
  }

  const ids = normalized.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    return fail("Ada ID barang duplikat dalam data yang dikirim.");
  }

  const savedImages: string[] = [];
  const replacedImages: string[] = [];
  let conn;

  try {
    // Simpan foto baru dahulu. Jika transaksi database gagal, file ini dibersihkan.
    const imageById = new Map<string, string>();
    for (const item of normalized) {
      const image = await saveImage(form.get(`image_${item.id}`));
      if (image) {
        imageById.set(item.id, image);
        savedImages.push(image);
      }
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [existingRows] = await conn.execute<DBRow[]>(
      `SELECT id_barang, gambar FROM tb_barang_gc WHERE id_barang IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
      ids,
    );
    const existingById = new Map(
      existingRows.map((row) => [String(row.id_barang), row.gambar ? String(row.gambar) : null]),
    );
    const missingIds = ids.filter((id) => !existingById.has(id));
    if (missingIds.length) throw new Error(`Barang tidak ditemukan: ${missingIds.join(", ")}.`);

    for (const item of normalized) {
      const newImage = imageById.get(item.id);
      const assignments = [
        "nama_barang = ?",
        "kategori = ?",
        "expired = ?",
        "qty_awal = ?",
        "qty_terkini = ?",
        "plu = ?",
      ];
      const values: any[] = [
        item.name,
        item.category,
        item.expired,
        item.qtyInitial,
        item.qtyCurrent,
        item.plu,
      ];

      if (newImage) {
        assignments.push("gambar = ?");
        values.push(newImage);
        const oldImage = existingById.get(item.id);
        if (oldImage) replacedImages.push(oldImage);
      }

      values.push(item.id);
      await conn.execute(
        `UPDATE tb_barang_gc SET ${assignments.join(", ")} WHERE id_barang = ?`,
        values,
      );
    }

    await conn.commit();

    // Foto lama baru dihapus setelah commit sukses.
    for (const oldImage of replacedImages) await removeImage(oldImage);

    return NextResponse.json({
      success: true,
      message: `${normalized.length} data barang berhasil diperbarui.`,
      updated: normalized.length,
      imagesUpdated: savedImages.length,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        // Pertahankan error utama jika rollback juga gagal.
      }
    }
    for (const filename of savedImages) await removeImage(filename);
    const message = error instanceof Error ? error.message : databaseErrorMessage(error);
    return fail(message, 400);
  } finally {
    conn?.release();
  }
}
