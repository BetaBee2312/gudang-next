import { NextResponse } from "next/server";
import { getSession, isAdmin, type SessionUser } from "@/lib/auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSession();
  if (!user) return fail("Sesi berakhir. Silakan login kembali.", 401);
  return user;
}
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getSession();
  if (!user) return fail("Sesi berakhir. Silakan login kembali.", 401);
  if (!isAdmin(user)) return fail("Aksi ini hanya untuk Admin atau Creator.", 403);
  return user;
}
export function isResponse(value: SessionUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
