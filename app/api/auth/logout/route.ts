import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("gudang_session")?.value;
  if (token) {
    try {
      const sessionHash = createHash("sha256").update(token).digest("hex");
      await db.execute("DELETE FROM tb_user_presence WHERE session_hash = ?", [sessionHash]);
    } catch {
      // Tabel presence mungkin belum dibuat pada login pertama.
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set("gudang_session", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
  return response;
}
