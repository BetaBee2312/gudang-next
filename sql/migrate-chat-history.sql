-- Jalankan pada database lama setelah backup. Membuat tabel riwayat chatbot
-- baru agar tidak bergantung pada format/enkripsi tb_chat_history lama.
CREATE TABLE IF NOT EXISTS tb_chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_karyawan VARCHAR(60) NOT NULL,
  role ENUM('user','model') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_user_created (no_karyawan, created_at),
  CONSTRAINT fk_chat_messages_user FOREIGN KEY (no_karyawan) REFERENCES tb_akun(no_karyawan) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
