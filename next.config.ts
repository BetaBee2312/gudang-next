import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/index.php", destination: "/barang", permanent: false },
      { source: "/index-md.php", destination: "/stok-habis", permanent: false },
      { source: "/barang-habis.php", destination: "/stok-habis", permanent: false },
      { source: "/barang-habis-md.php", destination: "/stok-habis", permanent: false },
      { source: "/list-alokasi.php", destination: "/alokasi", permanent: false },
      { source: "/list-cabang.php", destination: "/cabang", permanent: false },
      { source: "/list-serah.php", destination: "/serah-terima", permanent: false },
      { source: "/akun-terdaftar.php", destination: "/akun", permanent: false },
      { source: "/pengaturan-akun.php", destination: "/profil", permanent: false },
      { source: "/edit-profil.php", destination: "/profil", permanent: false },
      { source: "/chat-ai.php", destination: "/chat-ai", permanent: false },
      { source: "/login.php", destination: "/login", permanent: false },
      { source: "/logout.php", destination: "/login", permanent: false },
      { source: "/export-excel.php", destination: "/api/barang/export", permanent: false },
    ];
  },
};

export default nextConfig;
