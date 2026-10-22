import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  let savedPath: string | null = null;
  try {
    const data = await request.formData();
    const photo = data.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return fail("Pilih foto profil terlebih dahulu.");
    if (photo.size > 5 * 1024 * 1024) return fail("Ukuran foto maksimal 5 MB.");
    const extensionByMime: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const extension = extensionByMime[photo.type];
    if (!extension) return fail("Format foto yang didukung: JPG, PNG, WebP, atau GIF.");
    const filename = `${randomBytes(16).toString("hex")}${extension}`;
    const directory = path.join(process.cwd(), "public", "profile");
    await mkdir(directory, { recursive: true });
    savedPath = path.join(directory, filename);
    await writeFile(savedPath, Buffer.from(await photo.arrayBuffer()), { flag: "wx" });
    return NextResponse.json({ success: true, profilepic: filename });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal mengunggah foto profil.", 500);
  }
}
