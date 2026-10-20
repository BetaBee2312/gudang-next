import { NextRequest, NextResponse } from "next/server";
import { db, type DBRow } from "@/lib/db";
import { requireUser, isResponse, fail } from "@/lib/http";

export const runtime = "nodejs";
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    const [rows] = await db.execute<DBRow[]>("SELECT role, message, created_at FROM tb_chat_messages WHERE no_karyawan = ? ORDER BY created_at ASC LIMIT 200", [user.no_karyawan]);
    return NextResponse.json({ success: true, data: rows.map(row => ({ role: String(row.role) === "user" ? "user" : "model", text: String(row.message ?? "") })) });
  } catch {
    // Proyek lama belum tentu memiliki tabel tambahan ini. Jawaban AI tetap dapat dipakai tanpa histori permanen.
    return NextResponse.json({ success: true, data: [] });
  }
}
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail("GEMINI_API_KEY belum diisi pada .env.local. Chatbot belum bisa menghubungi Gemini.", 503);
  try {
    const body = await request.json();
    const message = String(body.message ?? "").trim();
    const history: Array<{ role: string; text: string }> = Array.isArray(body.history) ? body.history.slice(-12) : [];
    if (!message) return fail("Pesan tidak boleh kosong.");
    let inventoryContext = "";
    try {
      const sql = user.division.toLowerCase() === "md"
        ? "SELECT nama_barang, kategori, qty_terkini, expired, plu FROM tb_barang_gc WHERE kategori LIKE '%MD%' ORDER BY nama_barang ASC LIMIT 150"
        : "SELECT nama_barang, kategori, qty_terkini, expired, plu FROM tb_barang_gc ORDER BY nama_barang ASC LIMIT 150";
      const [rows] = await db.execute<DBRow[]>(sql);
      inventoryContext = rows.map(r => `${r.nama_barang} | kategori=${r.kategori} | stok=${r.qty_terkini} | expired=${r.expired ?? "-"} | PLU=${r.plu ?? "-"}`).join("\n");
    } catch { inventoryContext = "Data inventori belum tersedia."; }
    const contents = [
      ...history.filter(h => ["user", "model"].includes(h.role)).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: `Kamu adalah asisten internal Gudang Marketing. Jawab dalam bahasa Indonesia, akurat, singkat, dan jangan mengarang stok. Pengguna: ${user.nama} (${user.division}). Data inventori terkini yang tersedia:\n${inventoryContext}\nJika data tidak tercantum, katakan bahwa data tidak tersedia. Kamu tidak boleh mengklaim melakukan perubahan database; arahkan pengguna ke modul terkait.` }] }, contents, generationConfig: { temperature: 0.25, maxOutputTokens: 1200 } }),
    });
    const payload = await response.json();
    if (!response.ok) return fail(String(payload?.error?.message ?? "Permintaan Gemini gagal."), response.status);
    const answer = payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("\n").trim();
    if (!answer) return fail("AI tidak mengembalikan jawaban.", 502);
    try {
      await db.execute("INSERT INTO tb_chat_messages (no_karyawan, role, message) VALUES (?, 'user', ?), (?, 'model', ?)", [user.no_karyawan, message, user.no_karyawan, answer]);
    } catch {
      // Persistensi chat opsional untuk database yang belum menjalankan sql/migrate-chat-history.sql.
    }
    return NextResponse.json({ success: true, answer });
  } catch (error) { return fail(error instanceof Error ? error.message : "Gagal memproses pesan AI.", 500); }
}
