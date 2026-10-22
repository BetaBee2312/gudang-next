import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { requireUser, requireAdmin, isResponse, fail } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    if (isAdmin(user)) {
      const [rows] = await db.execute<DBRow[]>("SELECT no_karyawan, nama, jabatan, division, kategori, profilepic FROM tb_akun ORDER BY nama ASC");
      return NextResponse.json({ success: true, data: rows });
    }
    const [rows] = await db.execute<DBRow[]>("SELECT no_karyawan, nama, jabatan, division, kategori, profilepic FROM tb_akun WHERE no_karyawan = ?", [user.no_karyawan]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const b = await request.json();
    const no = String(b.no_karyawan ?? "").trim(); const nama = String(b.nama ?? "").trim();
    const password = String(b.password ?? ""); const jabatan = String(b.jabatan ?? "").trim();
    const division = String(b.division ?? "Marketing").trim(); const kategori = String(b.kategori ?? "User").trim();
    if (!no || !nama || password.length < 6 || !jabatan || !division || !kategori) return fail("Lengkapi seluruh data. Password minimal 6 karakter.");
    const hash = await bcrypt.hash(password, 12);
    await db.execute("INSERT INTO tb_akun (no_karyawan, nama, jabatan, division, kategori, password, profilepic) VALUES (?, ?, ?, ?, ?, ?, NULL)", [no, nama, jabatan, division, kategori, hash]);
    return NextResponse.json({ success: true, message: "Akun berhasil dibuat." }, { status: 201 });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  let uploadedPath: string | null = null;
  try {
    const formData = await request.formData();
    const nik = String(formData.get("no_karyawan") ?? "").trim();
    const nama = String(formData.get("nama") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const photo = formData.get("photo");
    if (!nik || !nama) return fail("NIK dan nama wajib diisi.");
    if (nik.length > 64 || nama.length > 150) return fail("NIK maksimal 64 karakter dan nama maksimal 150 karakter.");
    if (password && password.length < 6) return fail("Password minimal 6 karakter.");
    if (photo && !(photo instanceof File)) return fail("File foto tidak valid.");
    if (photo instanceof File && photo.size > 5 * 1024 * 1024) return fail("Ukuran foto maksimal 5 MB.");
    let filename: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
      const extension = extensions[photo.type];
      if (!extension) return fail("Format foto didukung: JPG, PNG, WebP, atau GIF.");
      filename = `${randomBytes(12).toString("hex")}${extension}`;
      const directory = path.join(process.cwd(), "public", "profile");
      await mkdir(directory, { recursive: true });
      uploadedPath = path.join(directory, filename);
      await writeFile(uploadedPath, Buffer.from(await photo.arrayBuffer()), { flag: "wx" });
    }

    const nikChanged = nik !== user.no_karyawan;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [current] = await conn.execute<DBRow[]>("SELECT no_karyawan FROM tb_akun WHERE no_karyawan = ? LIMIT 1 FOR UPDATE", [user.no_karyawan]);
      if (!current.length) throw new Error("Akun tidak ditemukan.");
      if (nikChanged) {
        const [duplicate] = await conn.execute<DBRow[]>("SELECT no_karyawan FROM tb_akun WHERE no_karyawan = ? LIMIT 1", [nik]);
        if (duplicate.length) throw new Error("NIK tersebut sudah digunakan akun lain.");
      }
      const updates = ["nama = ?"];
      const values: unknown[] = [nama];
      if (nikChanged) { updates.push("no_karyawan = ?"); values.push(nik); }
      if (password) { updates.push("password = ?"); values.push(await bcrypt.hash(password, 12)); }
      if (filename) { updates.push("profilepic = ?"); values.push(filename); }
      values.push(user.no_karyawan);
      await conn.execute(`UPDATE tb_akun SET ${updates.join(", ")} WHERE no_karyawan = ?`, values);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally { conn.release(); }

    return NextResponse.json({
      success: true,
      nikChanged,
      user: { no_karyawan: nik, nama, profilepic: filename },
      message: "Profil berhasil diperbarui.",
    });
  } catch (error) {
    if (uploadedPath) await unlink(uploadedPath).catch(() => {});
    return fail(databaseErrorMessage(error), 400);
  }
}
export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    const b = await request.json();
    const target = String(b.no_karyawan ?? user.no_karyawan).trim();
    const ownProfile = target === user.no_karyawan;
    const admin = isAdmin(user);
    if (!ownProfile && !admin) return fail("Tidak diizinkan mengubah akun orang lain.", 403);
    const updates: string[] = []; const values: unknown[] = [];
    if (Object.hasOwn(b, "nama")) { updates.push("nama = ?"); values.push(String(b.nama).trim()); }
    if (Object.hasOwn(b, "jabatan") && admin) { updates.push("jabatan = ?"); values.push(String(b.jabatan).trim()); }
    if (Object.hasOwn(b, "division") && admin) { updates.push("division = ?"); values.push(String(b.division).trim()); }
    if (Object.hasOwn(b, "kategori") && admin) { updates.push("kategori = ?"); values.push(String(b.kategori).trim()); }
    if (Object.hasOwn(b, "profilepic")) { updates.push("profilepic = ?"); values.push(String(b.profilepic ?? "").trim() || null); }
    if (b.password) {
      if (String(b.password).length < 6) return fail("Password minimal 6 karakter.");
      updates.push("password = ?"); values.push(await bcrypt.hash(String(b.password), 12));
    }
    if (!updates.length) return fail("Tidak ada perubahan yang valid.");
    values.push(target);
    await db.execute(`UPDATE tb_akun SET ${updates.join(", ")} WHERE no_karyawan = ?`, values);
    return NextResponse.json({ success: true, message: "Akun berhasil diperbarui. Login ulang mungkin diperlukan." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (isResponse(user)) return user;
  try {
    const b = await request.json(); const ids: string[] = Array.isArray(b.ids) ? b.ids.map((v: unknown) => String(v)) : [String(b.no_karyawan ?? "")];
    const safe = ids.filter(v => v.trim() && v !== user.no_karyawan);
    if (!safe.length) return fail("Pilih akun lain yang ingin dihapus. Akun yang sedang dipakai tidak dapat dihapus.");
    await db.execute(`DELETE FROM tb_akun WHERE no_karyawan IN (${safe.map(() => "?").join(",")})`, safe);
    return NextResponse.json({ success: true, message: `${safe.length} akun dihapus.` });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
