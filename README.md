# Gudang Marketing

Aplikasi manajemen inventori Gudang Marketing yang dimigrasikan dari PHP ke **Next.js App Router**. Aplikasi menyediakan pengelolaan stok, alokasi barang, serah terima, data cabang, akun pengguna, ekspor laporan, dan asisten AI internal.

> **Status migrasi:** aplikasi Next.js tersedia di branch `main`. Sebelum menjalankan pada database produksi, cocokkan skema database yang digunakan dengan query di `app/api` dan buat backup terlebih dahulu.

## AI-assisted development

This project is developed by **BetaBee2312** with AI assistance from **ChatGPT by OpenAI** for code review, debugging, implementation support, and documentation. Repository commits are attributed to the GitHub account that publishes them; AI assistance is acknowledged here rather than represented as a GitHub user or commit author.

## Teknologi

- **Framework:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS v4, CSS responsif, Lucide React
- **Database:** MySQL dengan `mysql2/promise`
- **Autentikasi:** cookie HTTP-only dengan token bertanda tangan (`jose`), password hash bcrypt
- **Laporan:** ExcelJS untuk ekspor XLSX, jsPDF dan jsPDF AutoTable untuk PDF
- **AI:** Google Gemini API melalui endpoint server-side

## Fitur

### Inventori
- Melihat daftar barang, mencari nama/ID/PLU, dan memfilter kategori.
- Menambah, mengedit, dan menghapus barang sesuai hak akses.
- Mengunggah gambar barang.
- Melihat stok, alokasi, dan tanggal kedaluwarsa.
- Mengekspor laporan Excel dan melakukan rollover stok bulanan ke arsip.

### Alokasi barang
- Mengajukan alokasi satu atau beberapa barang ke cabang.
- Memvalidasi stok di dalam transaksi database.
- Mengonfirmasi atau menolak alokasi untuk Admin/Creator.
- Mengembalikan stok untuk alokasi berstatus pending yang ditolak atau dihapus.

### Serah terima
- Membuat dokumen dengan beberapa item keperluan.
- Melihat riwayat serah terima.
- Mengekspor atau mencetak dokumen sesuai fitur di halaman.

### Cabang dan akun
- Mengelola daftar cabang.
- Mengelola akun dan profil pengguna.
- Membatasi aksi administratif berdasarkan kategori akun.

### Gudang Marketing AI
- Mengirim pertanyaan ke Gemini menggunakan kunci API yang tersimpan di server.
- Menyertakan konteks inventori yang diizinkan untuk membantu menjawab pertanyaan stok.
- Menyimpan riwayat chat di browser; penyimpanan permanen database bersifat opsional.

## Persyaratan

- Node.js **20.9 atau lebih baru**.
- npm.
- MySQL yang aktif dan dapat diakses aplikasi.
- Google Gemini API key bila fitur AI digunakan.

Gunakan versi Node.js yang didukung oleh versi Next.js di proyek. Dependensi terkunci tercatat di `package-lock.json`.

## Menjalankan secara lokal

1. Clone repositori dan masuk ke folder proyek:

   ```bash
   git clone https://github.com/BetaBee2312/gudang-next.git
   cd gudang-next
   ```

2. Pasang dependency:

   ```bash
   npm install
   ```

3. Buat file **`.env.local`** di root proyek. Isi dengan konfigurasi lokal berikut, lalu sesuaikan nilainya:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=gudang_marketing

   SESSION_SECRET=ganti_dengan_string_acak_minimal_32_karakter

   GEMINI_API_KEY=
   # Opsional:
   GEMINI_MODEL=gemini-2.5-flash
   ```

   Buat rahasia sesi acak yang kuat dan jangan gunakan contoh di atas sebagai nilai produksi.

4. Siapkan database. Jika memakai database lama, **backup lebih dulu** dan bandingkan struktur tabel aktual dengan query aplikasi. File `sql/schema-baseline.sql` ditujukan untuk instalasi database baru, bukan untuk dijalankan tanpa pemeriksaan pada database produksi.

5. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

6. Buka [http://localhost:3000](http://localhost:3000).

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm run start` | Menjalankan build produksi yang sudah dibuat |
| `npm run lint` | Menjalankan ESLint |

Sebelum menjalankan `npm run start`, buat build dengan `npm run build`.

## Struktur proyek

```text
app/
  api/
    akun/                 # Endpoint akun
    alokasi/              # Endpoint alokasi stok
    auth/                 # Login, logout, sesi aktif
    barang/               # Inventori, bulk, ekspor, rollover
    cabang/               # Endpoint cabang
    chat/                 # Proxy Gemini dan histori chat
    serah-terima/         # Endpoint serah terima
  akun/                   # UI manajemen akun
  alokasi/                # UI alokasi
  barang/                 # UI inventori
  cabang/                 # UI cabang
  chat-ai/                # UI asisten AI
  login/                  # Halaman login
  profil/                 # Halaman profil
  serah-terima/           # UI serah terima
  stok-habis/              # Tampilan stok habis
components/
  DashboardShell.tsx      # Layout dan navigasi
  InventoryPage.tsx       # Tampilan inventori bersama
lib/
  auth.ts                 # Sesi dan hak akses
  client.ts               # Helper request di browser
  db.ts                   # Pool koneksi MySQL
  http.ts                 # Helper respons dan autentikasi API
sql/
  schema-baseline.sql     # Skema dasar database baru
  migrate-chat-history.sql # Tabel histori AI opsional
migration/                # Referensi kode PHP/JS lama
public/
  gambar/                 # Lokasi gambar barang yang diunggah
```

## Database

Aplikasi menggunakan tabel yang dirujuk di endpoint server, antara lain:

- `tb_akun`: akun dan hak akses pengguna.
- `tb_barang_gc`: data barang dan stok.
- `tb_cabang`: data cabang.
- `tb_list_alokasi`: riwayat alokasi.
- `tb_serah_terima`: data serah terima.
- `tb_barang_arsip`: arsip stok bulanan.
- `tb_chat_messages`: riwayat AI permanen opsional.

File `sql/schema-baseline.sql` berisi skema dasar berdasarkan kolom yang digunakan kode saat ini. Database lama dapat memiliki perbedaan struktur. Jangan menganggap skema dasar ini sebagai migrasi otomatis untuk database yang sudah berjalan.

Untuk mengaktifkan penyimpanan riwayat chatbot ke database, tinjau dan jalankan `sql/migrate-chat-history.sql` setelah backup. Fitur AI tetap memerlukan `GEMINI_API_KEY`.

## Autentikasi dan keamanan

- Cookie sesi memakai atribut HTTP-only dan konfigurasi secure di lingkungan produksi.
- Rahasia sesi `SESSION_SECRET` wajib diisi dan minimal 32 karakter.
- Password akun disimpan sebagai hash bcrypt. Password teks biasa tidak didukung untuk login.
- Endpoint server memeriksa sesi dan membatasi operasi administratif untuk kategori Admin/Creator sesuai implementasi tiap modul.
- Kunci Gemini dan kredensial database harus disimpan di variabel lingkungan server.
- Jangan commit `.env.local`, password, API key, dump database, atau data pengguna ke Git.
- Batasi akses jaringan ke database dan gunakan akun database dengan hak akses minimum yang diperlukan.

## Gambar dan file unggahan

Direktori `public/gambar/` disiapkan sebagai lokasi gambar barang. File gambar lokal yang diabaikan oleh Git tidak otomatis tersedia setelah clone atau deploy ke server lain. Pindahkan aset yang diperlukan dengan prosedur aman dan pastikan URL gambar di UI cocok dengan lokasi penyimpanannya.

Untuk deployment dengan banyak instance atau filesystem sementara, gunakan penyimpanan file persisten/objek yang sesuai; jangan mengandalkan folder lokal yang tidak persisten untuk menyimpan unggahan.

## Migrasi dari PHP

Folder `migration/` menyimpan beberapa file JavaScript/CSS lama sebagai referensi audit. Aplikasi Next.js aktif berjalan melalui halaman di `app/` dan endpoint di `app/api/`, bukan dengan menjalankan file PHP lama.

Beberapa berkas konfigurasi dan aset proyek PHP asal mungkin tidak tersedia dalam arsip awal migrasi. Periksa kembali aset gambar, skema database, serta perilaku masing-masing modul sebelum mengganti aplikasi lama di lingkungan produksi.

## Troubleshooting

**Tidak bisa terhubung ke MySQL**
- Pastikan MySQL berjalan.
- Periksa `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` di `.env.local`.
- Pastikan user database memiliki izin terhadap database yang dipilih.

**Login ditolak**
- Pastikan `tb_akun` berisi akun dengan hash bcrypt yang valid.
- Periksa nama kolom database terhadap query aplikasi.
- Pastikan `SESSION_SECRET` disetel dengan nilai yang sama selama sesi berjalan.

**Chat AI tidak menjawab**
- Pastikan `GEMINI_API_KEY` valid dan model di `GEMINI_MODEL` tersedia untuk API key.
- Periksa log server untuk detail respons provider. Jangan menampilkan atau membagikan API key.

**Gambar barang tidak muncul**
- Periksa apakah file gambar ada di lokasi yang benar.
- Pastikan nama file pada kolom database cocok dengan file yang tersimpan dan jalur URL gambar sesuai dengan konfigurasi UI.

**Build atau lint gagal**
- Jalankan `npm install` agar dependency sesuai dengan `package-lock.json`.
- Periksa pesan error spesifik dari `npm run lint` atau `npm run build`; dokumentasi ini tidak mengklaim bahwa perintah tersebut sudah berhasil dijalankan.

## Pemetaan PHP ke Next.js

| Fitur/file PHP lama | Bagian Next.js |
| --- | --- |
| Login dan logout | `/login`, `/api/auth/login`, `/api/auth/logout` |
| Daftar barang dan stok habis | `/barang`, `/stok-habis` |
| Edit/tambah/hapus barang | `/api/barang` |
| Ekspor dan rollover stok | `/api/barang/export`, `/api/barang/renew` |
| Alokasi | `/alokasi`, `/api/alokasi` |
| Cabang | `/cabang`, `/api/cabang` |
| Serah terima | `/serah-terima`, `/api/serah-terima` |
| Akun dan profil | `/akun`, `/profil`, `/api/akun` |
| Chat AI | `/chat-ai`, `/api/chat` |

---

Internal inventory management application built with Next.js.
