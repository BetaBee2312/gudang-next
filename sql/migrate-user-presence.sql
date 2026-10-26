-- Jalankan sekali di database produksi melalui phpMyAdmin / SQL.
-- Membuat tabel untuk status Online/Offline akun.
CREATE TABLE IF NOT EXISTS tb_user_presence (
  session_hash CHAR(64) NOT NULL PRIMARY KEY,
  no_karyawan VARCHAR(100) NOT NULL,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_presence_user_seen (no_karyawan, last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
