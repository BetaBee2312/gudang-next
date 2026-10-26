import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, databaseErrorMessage, type DBRow } from "@/lib/db";
import { createSession, sessionCookieOptions, type SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const noKaryawan = String(body.no_karyawan ?? "").trim();
    const password = String(body.password ?? "");
    if (!noKaryawan || !password) return NextResponse.json({ success: false, message: "Nomor karyawan dan password wajib diisi." }, { status: 400 });

    const [rows] = await db.execute<DBRow[]>(
      "SELECT no_karyawan, nama, jabatan, division, kategori, profilepic, password FROM tb_akun WHERE no_karyawan = ? LIMIT 1",
      [noKaryawan],
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ success: false, message: "No karyawan tidak ditemukan." }, { status: 401 });

    const passHash = String(row.password ?? "");
    const passwordValid = passHash.startsWith("$2") ? await bcrypt.compare(password, passHash) : false;
    if (!passwordValid) return NextResponse.json({ success: false, message: "Password salah atau format hash tidak didukung." }, { status: 401 });

    const user: SessionUser = {
      no_karyawan: String(row.no_karyawan),
      nama: String(row.nama ?? ""),
      jabatan: String(row.jabatan ?? ""),
      division: String(row.division ?? ""),
      kategori: String(row.kategori ?? ""),
      profilepic: row.profilepic ? String(row.profilepic) : null,
    };
    const token = await createSession(user);
    const response = NextResponse.json({ success: true, user, redirect: ["md", "md-ho", "md-d53", "md-dgbg"].includes(String(user.division ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-")) ? "/stok-habis" : "/barang" });
    response.cookies.set("gudang_session", token, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: databaseErrorMessage(error) }, { status: 500 });
  }
}
