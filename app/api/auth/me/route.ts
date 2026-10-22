import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
