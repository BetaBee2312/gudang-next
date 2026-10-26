import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { requireUser, isResponse, fail } from "@/lib/http";

function normalizeDivision(value: unknown): string {
  const key = String(value ?? "MKT").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (["marketing", "mkt"].includes(key)) return "MKT";
  if (key === "md") return "MD";
  if (["marketing-ho", "mkt-ho"].includes(key)) return "MKT-HO";
  if (key === "md-ho") return "MD-HO";
  return String(value ?? "MKT").trim() || "MKT";
}

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
    const division = normalizeDivision(b.division ?? "MKT"); const kategori = String(b.kategori ?? "User").trim();
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
    if (Object.hasOwn(b, "division") && admin) { updates.push("division = ?"); values.push(normalizeDivision(b.division)); }
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
    const b = await request.json();
    const ids: string[] = Array.isArray(b.ids) ? b.ids.map((v: unknown) => String(v).trim()) : [String(b.no_karyawan ?? "").trim()];
    const safe = [...new Set(ids.filter(v => v && v !== user.no_karyawan))];
    if (!safe.length) return fail("Pilih akun lain yang ingin dihapus. Akun yang sedang dipakai tidak dapat dihapus.");

    const [accounts] = await db.execute<DBRow[]>(
      `SELECT no_karyawan, profilepic FROM tb_akun WHERE no_karyawan IN (${safe.map(() => "?").join(",")})`,
      safe,
    );
    await db.execute(`DELETE FROM tb_akun WHERE no_karyawan IN (${safe.map(() => "?").join(",")})`, safe);

    const profileDir = path.join(process.cwd(), "public", "profile");
    for (const account of accounts) {
      if (!account.profilepic) continue;
      const filename = path.basename(String(account.profilepic));
      try {
        const [remaining] = await db.execute<DBRow[]>(
          "SELECT COUNT(*) AS count FROM tb_akun WHERE profilepic = ?",
          [filename],
        );
        if (Number(remaining[0]?.count ?? 0) === 0) {
          await unlink(path.join(profileDir, filename));
        }
      } catch {
        // If reference checking fails, preserve the file rather than risk deleting a shared photo.
      }
    }
    return NextResponse.json({ success: true, message: `${accounts.length} akun dihapus.` });
  } catch (error) { return fail(databaseErrorMessage(error), 500); }
}
