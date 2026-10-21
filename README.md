# Gudang Marketing

Aplikasi manajemen inventori Gudang Marketing yang dimigrasikan dari PHP ke **Next.js App Router**. Sistem ini mencakup pengelolaan stok, alokasi barang, serah terima, data cabang, akun pengguna, ekspor laporan, dan asisten AI internal.

> Sebelum menjalankan pada database produksi, cocokkan skema database dengan query di `app/api` dan buat backup. `sql/schema-baseline.sql` ditujukan untuk database baru, bukan untuk dijalankan tanpa pemeriksaan pada database lama.

## Fitur

- **Inventori:** pencarian nama/ID/PLU, filter kategori, tambah/edit/hapus barang, gambar produk, ekspor Excel, dan rollover stok bulanan.
- **Stok habis / MD:** daftar barang dengan stok nol dan pembatasan kategori sesuai divisi.
- **Alokasi:** pengajuan multi-item, validasi stok menggunakan transaksi database, konfirmasi/penolakan oleh Admin/Creator, dan pengembalian stok untuk alokasi pending yang ditolak atau dihapus.
- **Serah terima:** form multi-item, riwayat, penghapusan administratif, serta ekspor/print dokumen sesuai fitur halaman.
- **Cabang dan akun:** pengelolaan master cabang, akun, dan profil berdasarkan hak akses.
- **Gudang Marketing AI:** integrasi Gemini server-side dengan konteks inventori; penyimpanan histori permanen opsional melalui `tb_chat_messages`.

## Teknologi

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4 dan Lucide React
- MySQL melalui `mysql2/promise`
- Sesi bertanda tangan dengan `jose`, cookie HTTP-only, dan password hash bcrypt
- ExcelJS untuk ekspor XLSX
- jsPDF dan jsPDF AutoTable untuk dokumen PDF
- Google Gemini API untuk asisten AI

## Persyaratan

- Node.js 20.9 atau lebih baru.
- npm.
- MySQL/MariaDB yang bisa diakses aplikasi.
- Gemini API key bila fitur AI digunakan.

## Menjalankan lokal

1. Clone repositori dan pasang dependency:

   ```bash
   git clone https://github.com/BetaBee2312/gudang-next.git
   cd gudang-next
   npm install
   ```

2. Buat `.env.local` di root proyek:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gudang_marketing

   SESSION_SECRET=ganti_dengan_string_acak_minimal_32_karakter

   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-2.5-flash
   ```

   Buat `SESSION_SECRET` yang acak dan kuat untuk penggunaan sebenarnya. Jangan commit `.env.local`.

3. Siapkan database:
   - Jika menggunakan database lama, backup dan bandingkan nama/tipe kolom terhadap API sebelum menjalankan aplikasi.
   - Untuk database baru, tinjau lalu jalankan `sql/schema-baseline.sql`.
   - Untuk histori AI permanen, tinjau lalu jalankan `sql/migrate-chat-history.sql` setelah backup.
   - Pastikan akun yang digunakan memiliki hash password bcrypt yang valid; password teks biasa tidak didukung login.

4. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

## Perintah npm

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat build produksi |
| `npm run start` | Menjalankan build produksi |
| `npm run lint` | Menjalankan ESLint |

Sebelum `npm run start`, jalankan `npm run build`.

## Struktur proyek

```text
app/
  api/
    akun/                 # Endpoint manajemen akun
    alokasi/              # Endpoint alokasi
    auth/                 # Login, logout, dan sesi aktif
    barang/               # CRUD, bulk, ekspor, rollover
    cabang/               # Endpoint cabang
    chat/                 # Proxy Gemini dan histori
    serah-terima/         # Endpoint serah terima
  akun/                   # Halaman manajemen akun
  alokasi/                # Halaman alokasi
  barang/                 # Halaman inventori
  cabang/                 # Halaman cabang
  chat-ai/                # UI asisten AI
  login/                  # Login
  profil/                 # Profil
  serah-terima/           # Halaman serah terima
  stok-habis/             # Daftar stok habis
components/
  DashboardShell.tsx      # Layout dan navigasi
  InventoryPage.tsx       # Komponen inventori
lib/
  auth.ts                 # Sesi dan hak akses
  client.ts               # Helper fetch di browser
  db.ts                   # Pool MySQL
  http.ts                 # Helper respons API
sql/
  schema-baseline.sql     # Skema dasar database baru
  migrate-chat-history.sql # Histori AI opsional
migration/                # Referensi kode PHP/JS lama
public/gambar/             # Lokasi gambar barang yang diunggah
```

## API utama

| Endpoint | Kegunaan |
| --- | --- |
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Sesi pengguna |
| `/api/barang` | Daftar, tambah, edit, dan hapus barang |
| `/api/barang/bulk` | Edit massal |
| `/api/barang/export` | Ekspor Excel |
| `/api/barang/renew` | Rollover stok bulanan |
| `/api/alokasi` | Alokasi dan keputusan pending |
| `/api/cabang` | Master cabang |
| `/api/serah-terima` | Dokumen serah terima |
| `/api/akun` | Akun dan profil |
| `/api/chat` | Asisten Gemini dan histori chat |

Periksa Route Handler untuk payload, validasi, dan hak akses terkini.

## Database

Tabel yang digunakan antara lain:

- `tb_akun`: pengguna dan hak akses.
- `tb_barang_gc`: barang dan stok.
- `tb_cabang`: master cabang.
- `tb_list_alokasi`: riwayat alokasi.
- `tb_serah_terima`: detail serah terima.
- `tb_barang_arsip`: arsip stok bulanan.
- `tb_chat_messages`: histori chatbot opsional.

Skema dasar hanya berisi kolom yang diperlukan kode saat ini. Database produksi mungkin memiliki struktur berbeda; periksa query dan lakukan backup sebelum migrasi.

## Keamanan dan deployment

- Cookie sesi menggunakan atribut HTTP-only; gunakan HTTPS dan lingkungan produksi yang dikonfigurasi dengan benar.
- `SESSION_SECRET` harus acak, rahasia, dan minimal 32 karakter.
- Password disimpan sebagai hash bcrypt.
- Kunci Gemini, kredensial database, dan file environment hanya boleh berada di server.
- Gunakan user MySQL khusus dengan hak minimum, bukan akun root, untuk deployment.
- Jangan commit `.env.local`, API key, dump database, atau data pengguna.
- Folder `public/gambar/` bersifat lokal. Pada server lain/hosting dengan filesystem sementara, pindahkan aset yang diperlukan dan gunakan storage persisten untuk unggahan.

## Pemetaan dari aplikasi PHP

| Fitur PHP lama | Bagian Next.js |
| --- | --- |
| Login/logout | `/login`, `/api/auth/*` |
| Daftar barang dan stok habis | `/barang`, `/stok-habis` |
| Edit/tambah/hapus barang, ekspor, rollover | `/api/barang`, `/api/barang/export`, `/api/barang/renew` |
| Alokasi | `/alokasi`, `/api/alokasi` |
| Cabang | `/cabang`, `/api/cabang` |
| Serah terima | `/serah-terima`, `/api/serah-terima` |
| Akun/profil | `/akun`, `/profil`, `/api/akun` |
| Chat AI | `/chat-ai`, `/api/chat` |

Folder `migration/` menyimpan beberapa helper lama sebagai referensi, bukan sebagai runtime aplikasi Next.js.

## Troubleshooting

**MySQL tidak bisa dihubungi:** pastikan service berjalan dan periksa nilai `DB_*` di `.env.local`.

**Login gagal:** pastikan akun ada di `tb_akun` dan password tersimpan sebagai hash bcrypt yang valid.

**Chat AI gagal:** periksa `GEMINI_API_KEY`, nama model, akses API, dan log server tanpa membagikan kunci API.

**Gambar tidak tampil:** pastikan file tersedia di folder yang benar dan jalur URL cocok dengan implementasi UI.

## AI-assisted development

Dikembangkan oleh **BetaBee2312** dengan bantuan ChatGPT (OpenAI) untuk code review, debugging, dukungan implementasi, dan dokumentasi. Identitas commit tetap mengikuti akun GitHub yang menerbitkannya.
