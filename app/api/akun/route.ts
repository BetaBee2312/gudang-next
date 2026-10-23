import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { requireUser, isResponse, fail } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    if (user.kategori.toLowerCase() === "creator") {
      const [rows] = await db.execute<DBRow[]>("SELECT no_karyawan, nama, jabatan, division, kategori, profilepic FROM tb_akun ORDER BY nama ASC");
      return NextResponse.json({ success: true, data: rows });
    }
    const [rows] = await db.execute<DBRow[]>("SELECT no_karyawan, nama, jabatan, division, kategori, profilepic FROM tb_akun WHERE no_karyawan = ?", [user.no_karyawan]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.kategori.toLowerCase() !== "creator") return fail("Hanya Creator yang boleh mengelola akun terdaftar.", 403);
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
  if (user.kategori.toLowerCase() !== "creator") return fail("Hanya Creator yang boleh mengelola akun terdaftar. Untuk mengubah profil sendiri, gunakan halaman Profil Saya.", 403);
  try {
    const b = await request.json();
    const target = String(b.no_karyawan ?? user.no_karyawan).trim();
    const admin = true;
    const name = String(b.nama ?? "").trim();
    if (Object.hasOwn(b, "nama") && !name) return fail("Nama wajib diisi.");
    if (name.length > 150) return fail("Nama maksimal 150 karakter.");
    const updates: string[] = []; const values: any[] = [];
    if (Object.hasOwn(b, "nama")) { updates.push("nama = ?"); values.push(name); }
    if (Object.hasOwn(b, "jabatan") && admin) { updates.push("jabatan = ?"); values.push(String(b.jabatan).trim()); }
    if (Object.hasOwn(b, "division") && admin) { updates.push("division = ?"); values.push(String(b.division).trim()); }
    if (Object.hasOwn(b, "kategori") && admin) { updates.push("kategori = ?"); values.push(String(b.kategori).trim()); }
    if (Object.hasOwn(b, "profilepic") && admin) { updates.push("profilepic = ?"); values.push(String(b.profilepic ?? "").trim() || null); }
    if (b.password) {
      if (String(b.password).length < 6) return fail("Password minimal 6 karakter.");
      updates.push("password = ?"); values.push(await bcrypt.hash(String(b.password), 12));
    }
    if (!updates.length) return fail("Tidak ada perubahan yang valid.");
    values.push(target);
    await db.execute(`UPDATE tb_akun SET ${updates.join(", ")} WHERE no_karyawan = ?`, values);
    return NextResponse.json({ success: true, message: "Akun berhasil diperbarui." });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.kategori.toLowerCase() !== "creator") return fail("Hanya Creator yang boleh menghapus akun.", 403);
  try {
    const b = await request.json(); const ids: string[] = Array.isArray(b.ids) ? b.ids.map((v: unknown) => String(v)) : [String(b.no_karyawan ?? "")];
    const safe = ids.filter(v => v.trim() && v !== user.no_karyawan);
    if (!safe.length) return fail("Pilih akun lain yang ingin dihapus. Akun yang sedang dipakai tidak dapat dihapus.");
    await db.execute(`DELETE FROM tb_akun WHERE no_karyawan IN (${safe.map(() => "?").join(",")})`, safe);
    return NextResponse.json({ success: true, message: `${safe.length} akun dihapus.` });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
