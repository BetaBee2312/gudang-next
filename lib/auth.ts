import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { db, type DBRow } from "@/lib/db";

export type SessionUser = {
  no_karyawan: string;
  nama: string;
  kategori: string;
  division: string;
  jabatan?: string;
  profilepic?: string | null;
};

const COOKIE_NAME = "gudang_session";
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET wajib diisi dengan string acak minimal 32 karakter.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    const signedUser = payload.user as SessionUser | undefined;
    if (!signedUser?.no_karyawan) return null;
    // Ambil peran terkini dari DB agar perubahan hak akses/penghapusan akun segera berlaku.
    const [rows] = await db.execute<DBRow[]>("SELECT no_karyawan, nama, jabatan, division, kategori, profilepic FROM tb_akun WHERE no_karyawan = ? LIMIT 1", [signedUser.no_karyawan]);
    const row = rows[0];
    if (!row) return null;
    return {
      no_karyawan: String(row.no_karyawan),
      nama: String(row.nama ?? ""),
      jabatan: String(row.jabatan ?? ""),
      division: String(row.division ?? ""),
      kategori: String(row.kategori ?? ""),
      profilepic: row.profilepic ? String(row.profilepic) : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function isAdmin(user: SessionUser | null) {
  return Boolean(user && ["admin", "creator"].includes(user.kategori.toLowerCase()));
}
