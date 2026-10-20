import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __gudangPool: Pool | undefined;
}

function createPool(): Pool {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gudang_marketing",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+07:00",
    charset: "utf8mb4",
  });
}

export const db = global.__gudangPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__gudangPool = db;

export type DBRow = RowDataPacket & Record<string, unknown>;
export type { PoolConnection };

export function databaseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Kesalahan database tidak diketahui.";
  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return "MySQL belum bisa dihubungi. Periksa layanan MySQL dan konfigurasi .env.local.";
  }
  if (message.includes("Access denied")) return "Akses MySQL ditolak. Periksa DB_USER dan DB_PASSWORD.";
  if (message.includes("Unknown database")) return "Database pada DB_NAME belum tersedia.";
  if (message.includes("doesn't exist")) return "Tabel database belum lengkap. Jalankan atau sesuaikan sql/schema-baseline.sql.";
  return message;
}
