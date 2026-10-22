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
  let savedPhotoPath: string | null = null;
  try {
    const body = await request.json();
    const nik = String(body.no_karyawan ?? "").trim();
    const nama = String(body.nama ?? "").trim();
    const password = String(body.password ?? "");
    const profilepicProvided = Object.hasOwn(body, "profilepic");
    const profilepic = String(body.profilepic ?? "").trim();
    if (!nik || !nama) return fail("NIK dan nama wajib diisi.");
    if (nik.length > 64 || nama.length > 150) return fail("NIK maksimal 64 karakter dan nama maksimal 150 karakter.");
    if (password && password.length < 6) return fail("Password minimal 6 karakter.");
    if (profilepicProvided && profilepic && !/^[a-f0-9]{24,32}\.(jpg|png|webp|gif)$/.test(profilepic)) return fail("Nama file foto tidak valid.");

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
      if (profilepicProvided && profilepic) {
        const allowedPath = path.join(process.cwd(), "public", "profile", profilepic);
        const { stat } = await import("node:fs/promises");
        const fileStat = await stat(allowedPath).catch(() => null);
        if (!fileStat?.isFile()) throw new Error("Foto profil tidak ditemukan. Coba unggah ulang.");
      }
      const updates = ["nama = ?"];
      const values: unknown[] = [nama];
      if (nikChanged) { updates.push("no_karyawan = ?"); values.push(nik); }
      if (password) { updates.push("password = ?"); values.push(await bcrypt.hash(password, 12)); }
      if (profilepicProvided) { updates.push("profilepic = ?"); values.push(profilepic || null); }
      values.push(user.no_karyawan);
      await conn.execute(`UPDATE tb_akun SET ${updates.join(", ")} WHERE no_karyawan = ?`, values);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally { conn.release(); }
    if (nikChanged) {
      const response = NextResponse.json({ success: true, nikChanged, message: "NIK berhasil diubah. Silakan login kembali menggunakan NIK baru." });
      response.cookies.set("gudang_session", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
      return response;
    }
    return NextResponse.json({ success: true, nikChanged: false, message: "Profil berhasil diperbarui." });
  } catch (error) {
    if (savedPhotoPath) await unlink(savedPhotoPath).catch(() => {});
    return fail(databaseErrorMessage(error), 400);
  }
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
