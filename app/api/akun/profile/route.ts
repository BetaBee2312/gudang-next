import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { compressSquareJpeg } from "@/lib/image-processing";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";

const profileDir = () => path.join(process.cwd(), "public", "profile");
const MAX_UPLOAD = 20 * 1024 * 1024;

async function removeProfileIfUnused(filename: unknown, currentNik: string) {
  if (!filename) return;
  const safeName = path.basename(String(filename));
  if (!safeName || safeName === "." || safeName === "..") return;
  try {
    const [rows] = await db.execute<DBRow[]>(
      "SELECT COUNT(*) AS count FROM tb_akun WHERE profilepic = ? AND no_karyawan <> ?",
      [safeName, currentNik],
    );
    if (Number(rows[0]?.count ?? 0) > 0) return;
    await unlink(path.join(profileDir(), safeName));
  } catch {
    // Preserve the file if reference checking fails; a missing file is already cleaned up.
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  let savedPath: string | null = null;
  let previousPhoto: string | null = null;
  try {
    const form = await request.formData();
    const nik = String(form.get("no_karyawan") ?? "").trim();
    const nama = String(form.get("nama") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const photo = form.get("photo");
    if (!nik || !nama) return fail("NIK dan nama wajib diisi.");
    if (nik.length > 64 || nama.length > 150) return fail("NIK maksimal 64 karakter dan nama maksimal 150 karakter.");
    if (password && password.length < 6) return fail("Password minimal 6 karakter.");
    if (photo && !(photo instanceof File)) return fail("File foto tidak valid.");
    if (photo instanceof File && photo.size > MAX_UPLOAD) return fail("Ukuran foto maksimal 20 MB sebelum kompresi.");

    let photoName: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
      if (!supportedTypes.has(photo.type)) return fail("Format foto didukung: JPG, PNG, WebP, atau GIF.");
      const input = Buffer.from(await photo.arrayBuffer());
      const output = await compressSquareJpeg(input);
      photoName = `${randomBytes(12).toString("hex")}.jpg`;
      await mkdir(profileDir(), { recursive: true });
      savedPath = path.join(profileDir(), photoName);
      await writeFile(savedPath, output, { flag: "wx" });
    }

    const nikChanged = nik !== user.no_karyawan;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [current] = await conn.execute<DBRow[]>("SELECT no_karyawan, profilepic FROM tb_akun WHERE no_karyawan = ? LIMIT 1 FOR UPDATE", [user.no_karyawan]);
      if (!current.length) throw new Error("Akun tidak ditemukan.");
      if (nikChanged) {
        const [duplicate] = await conn.execute<DBRow[]>("SELECT no_karyawan FROM tb_akun WHERE no_karyawan = ? LIMIT 1", [nik]);
        if (duplicate.length) throw new Error("NIK tersebut sudah digunakan akun lain.");
      }
      previousPhoto = current[0].profilepic ? String(current[0].profilepic) : null;
      const updates = ["nama = ?"];
      const values: any[] = [nama];
      if (nikChanged) { updates.push("no_karyawan = ?"); values.push(nik); }
      if (password) { updates.push("password = ?"); values.push(await bcrypt.hash(password, 12)); }
      if (photoName) { updates.push("profilepic = ?"); values.push(photoName); }
      values.push(user.no_karyawan);
      await conn.execute(`UPDATE tb_akun SET ${updates.join(", ")} WHERE no_karyawan = ?`, values);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally { conn.release(); }

    if (photoName && previousPhoto && previousPhoto !== photoName) await removeProfileIfUnused(previousPhoto, nik);
    const response = NextResponse.json({ success: true, nikChanged, user: { no_karyawan: nik, nama, profilepic: photoName }, message: "Profil berhasil diperbarui." });
    if (nikChanged) response.cookies.set("gudang_session", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
    return response;
  } catch (error) {
    if (savedPath) await unlink(savedPath).catch(() => {});
    return fail(databaseErrorMessage(error), 400);
  }
}
