import { NextResponse } from "next/server";
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("gudang_session", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
  return response;
}
