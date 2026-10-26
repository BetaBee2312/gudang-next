import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, type DBRow } from "@/lib/db";
import { requireUser, isResponse } from "@/lib/http";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" };

async function ensurePresenceTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tb_user_presence (
      session_hash CHAR(64) NOT NULL PRIMARY KEY,
      no_karyawan VARCHAR(100) NOT NULL,
      last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_presence_user_seen (no_karyawan, last_seen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const token = request.cookies.get("gudang_session")?.value;
  if (!token) return NextResponse.json({ success: false }, { status: 401, headers: noStore });
  try {
    await ensurePresenceTable();
    const sessionHash = createHash("sha256").update(token).digest("hex");
    await db.execute(
      "INSERT INTO tb_user_presence (session_hash, no_karyawan, last_seen) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE no_karyawan = VALUES(no_karyawan), last_seen = NOW()",
      [sessionHash, user.no_karyawan],
    );
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    console.error("[presence:POST] Gagal memperbarui heartbeat:", error);
    return NextResponse.json({ success: false, message: "Status online belum bisa diperbarui. Periksa tabel tb_user_presence dan izin database." }, { status: 500, headers: noStore });
  }
}

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!["admin", "creator"].includes(user.kategori.toLowerCase())) {
    return NextResponse.json({ success: false, message: "Hanya Admin atau Creator yang boleh melihat status sesi seluruh akun." }, { status: 403, headers: noStore });
  }
  try {
    await ensurePresenceTable();
    const [rows] = await db.execute<DBRow[]>(`
      SELECT a.no_karyawan,
        COUNT(p.session_hash) AS active_sessions
      FROM tb_akun a
      LEFT JOIN tb_user_presence p
        ON p.no_karyawan = a.no_karyawan
        AND p.last_seen >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
      GROUP BY a.no_karyawan
    `);
    return NextResponse.json({ success: true, data: rows.map(row => ({
      no_karyawan: String(row.no_karyawan),
      active_sessions: Number(row.active_sessions ?? 0),
    })) }, { headers: noStore });
  } catch (error) {
    console.error("[presence:GET] Gagal membaca status sesi:", error);
    return NextResponse.json({ success: false, message: "Gagal membaca status sesi. Periksa tabel tb_user_presence dan izin database." }, { status: 500, headers: noStore });
  }
}
