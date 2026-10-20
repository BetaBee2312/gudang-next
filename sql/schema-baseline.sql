-- Skema dasar berdasar kolom yang benar-benar dipakai kode PHP yang dikirim.
-- Jalankan hanya pada database baru. Jika database lama sudah berisi tabel,
-- backup database lalu bandingkan kolom sebelum melakukan perubahan.

CREATE TABLE IF NOT EXISTS tb_akun (
  no_karyawan VARCHAR(60) NOT NULL PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  jabatan VARCHAR(120) NOT NULL DEFAULT '',
  division VARCHAR(80) NOT NULL DEFAULT 'Marketing',
  kategori VARCHAR(50) NOT NULL DEFAULT 'User',
  password VARCHAR(255) NOT NULL,
  profilepic VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_cabang (
  kode_cabang VARCHAR(60) NOT NULL PRIMARY KEY,
  nama_cabang VARCHAR(180) NOT NULL,
  singkatan VARCHAR(80) NULL,
  dc_support VARCHAR(120) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_barang_gc (
  id_barang VARCHAR(80) NOT NULL PRIMARY KEY,
  gambar VARCHAR(255) NULL,
  nama_barang VARCHAR(255) NOT NULL,
  kategori VARCHAR(80) NOT NULL,
  expired DATE NULL,
  qty_awal INT NOT NULL DEFAULT 0,
  qty_terkini INT NOT NULL DEFAULT 0,
  teralokasi INT NOT NULL DEFAULT 0,
  bulan VARCHAR(30) NOT NULL DEFAULT '',
  plu VARCHAR(80) NULL,
  INDEX idx_barang_nama (nama_barang),
  INDEX idx_barang_kategori (kategori),
  INDEX idx_barang_expired (expired)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_list_alokasi (
  id_alokasi VARCHAR(40) NOT NULL PRIMARY KEY,
  id_barang VARCHAR(80) NOT NULL,
  qty_teralokasi INT NOT NULL DEFAULT 0,
  nama_pemohon VARCHAR(180) NOT NULL,
  status VARCHAR(180) NOT NULL DEFAULT 'pending',
  tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  kode_cabang VARCHAR(60) NOT NULL,
  INDEX idx_alokasi_tanggal (tanggal),
  INDEX idx_alokasi_barang (id_barang),
  INDEX idx_alokasi_cabang (kode_cabang),
  INDEX idx_alokasi_status (status),
  CONSTRAINT fk_alokasi_barang FOREIGN KEY (id_barang) REFERENCES tb_barang_gc(id_barang) ON UPDATE CASCADE,
  CONSTRAINT fk_alokasi_cabang FOREIGN KEY (kode_cabang) REFERENCES tb_cabang(kode_cabang) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_serah_terima (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  nama VARCHAR(180) NOT NULL,
  jabatan VARCHAR(120) NOT NULL,
  tujuan VARCHAR(255) NOT NULL,
  tanggal DATE NOT NULL,
  keperluan TEXT NOT NULL,
  jumlah VARCHAR(80) NULL,
  cabang VARCHAR(180) NULL,
  INDEX idx_serah_tanggal (tanggal),
  INDEX idx_serah_tujuan (tujuan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_barang_arsip (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_barang VARCHAR(80) NOT NULL,
  nama_barang VARCHAR(255) NOT NULL,
  kategori VARCHAR(80) NOT NULL,
  expired DATE NULL,
  qty_awal INT NOT NULL DEFAULT 0,
  qty_terkini INT NOT NULL DEFAULT 0,
  teralokasi INT NOT NULL DEFAULT 0,
  bulan VARCHAR(30) NOT NULL DEFAULT '',
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_arsip_barang (id_barang),
  INDEX idx_arsip_bulan (bulan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel tambahan untuk riwayat chatbot Next.js. Tidak mengubah tb_chat_history lama.
CREATE TABLE IF NOT EXISTS tb_chat_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_karyawan VARCHAR(60) NOT NULL,
  role ENUM('user','model') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_user_created (no_karyawan, created_at),
  CONSTRAINT fk_chat_messages_user FOREIGN KEY (no_karyawan) REFERENCES tb_akun(no_karyawan) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
