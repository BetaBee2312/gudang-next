function exportExcel() {
    // 1. Ambil nilai filter saat ini
    const bulan = document.getElementById('bulan-export').value;
    const filterKategori = document.getElementById('filter-expired').value; // Contoh: 'md', 'marketing-d53', dll
    const kataKunci = document.getElementById('search-bar').value;

    // Validasi Bulan (Opsional, tapi disarankan)
    if (!bulan) {
        Swal.fire('Perhatian', 'Pilih bulan terlebih dahulu untuk export', 'warning');
        return;
    }

    // 2. Susun URL dengan parameter filter
    // Kita gunakan encodeURIComponent agar karakter spesial tidak merusak URL
    const url = `export-excel.php?bulan=${bulan}&filter=${filterKategori}&search=${encodeURIComponent(kataKunci)}`;

    // 3. Eksekusi download
    window.location.href = url;
}

function gantiBulan() {
    const bulanInput = document.getElementById('bulan-export').value;
    if (!bulanInput) {
        Swal.fire({
            icon: 'warning',
            title: 'Oops...',
            text: 'Pilih bulan dulu dong!',
            confirmButtonColor: '#FF9800'
        });
        return;
    }

    const [tahun, bulan] = bulanInput.split('-');

    Swal.fire({
        title: `Yakin mau rollover ke ${bulan}-${tahun}?`,
        text: "Semua alokasi akan direset ke 0!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, lanjut!',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: 'ganti-bulan.php',
                type: 'POST',
                data: { bulan, tahun },
                success: function (res) {
                    try {
                        const data = JSON.parse(res);
                        if (data.status === 'success') {
                            Swal.fire({
                                icon: 'success',
                                title: 'Berhasil!',
                                text: 'Rollover bulan sukses dilakukan!',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            setTimeout(() => location.reload(), 1500);
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Gagal!',
                                text: data.message || 'Gagal mengganti bulan'
                            });
                        }
                    } catch (e) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error!',
                            text: 'Response server tidak valid.'
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: 'error',
                        title: 'Server Error!',
                        text: 'Coba lagi nanti.'
                    });
                }
            });
        }
    });
}

document.querySelectorAll("[data-modal-open]").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-modal-open");
        const modal = document.querySelector(target);
        if (modal) modal.classList.add("is-active");
    });
});

document.addEventListener("click", e => {
    if (e.target.classList.contains("tutup-tambah-modal")) {
        const modal = e.target.closest(".modal");
        if (modal) modal.classList.remove("is-active");
    }
});


// Optional: klik di luar modal untuk nutup
document.addEventListener("click", e => {
    if (e.target.classList.contains("tambah-modal")) {
        e.target.classList.add("hidden");
    }
});


// Load saved filter pas halaman load
window.addEventListener('DOMContentLoaded', () => {
    // Selalu default ke 'mendekati' setiap kali page di-load/refresh
    document.getElementById('filter-expired').value = 'mendekati';
    localStorage.setItem('filterExpired', 'mendekati');
    applyFilters();
});

// Simpan filter tiap kali user ganti
document.getElementById('filter-expired').addEventListener('change', function() {
    localStorage.setItem('filterExpired', this.value);
    applyFilters();
});
document.getElementById('search-bar').addEventListener('input', applyFilters);

function applyFilters() {
    const filterValue = document.getElementById('filter-expired').value.toLowerCase().trim();
    const namaFilter = document.getElementById('search-bar').value.toLowerCase().trim();
    const now = new Date();

    // Ambil semua kolom (parent dari card) agar layout Bulma tidak berantakan
    const columns = document.querySelectorAll('#grid-kartu .column');

    columns.forEach(col => {
        const card = col.querySelector('.card');
        if (!card) return;

        let show = true;

        // Ambil data dari dataset
        const nama = (card.dataset.nama || "").toLowerCase();
        let kategori = (card.dataset.kategori || "").toLowerCase().trim();
        // Samakan format spasi menjadi dash (-) agar cocok dengan value dropdown
        kategori = kategori.replace(/\s+/g, '-'); 
        
        const expired = card.dataset.expired ? new Date(card.dataset.expired) : null;

        // Logic Filter Kategori / Expired
        if (filterValue === 'mendekati') {
            if (!expired) {
                show = false;
            } else {
                const diffDays = (expired - now) / (1000 * 60 * 60 * 24);
                if (diffDays > 90) show = false;
            }
        } else if (filterValue !== 'ascending') { 
            // Jika pilih kategori spesifik (md-d53, marketing, dll)
            if (kategori !== filterValue) {
                show = false;
            }
        }

        // Logic Search Bar
        if (namaFilter && !nama.includes(namaFilter)) {
            show = false;
        }

        // Terapkan perubahan langsung ke kolom
        col.style.setProperty('display', show ? 'block' : 'none', 'important');
    });
}

// Attach listener
document.getElementById('filter-expired').addEventListener('change', applyFilters);
document.getElementById('search-bar').addEventListener('input', applyFilters);

// Initialize
applyFilters();

function renderInlineExpiredStatus() {
    const now = new Date();

    document.querySelectorAll('.expired-inline').forEach(el => {
        const expiredValue = el.dataset.expired;
        const badge = el.querySelector('.expired-status-badge');

        if (!expiredValue) {
            badge.style.display = 'none';
            return;
        }

        const expiredDate = new Date(expiredValue);
        const diffDays = (expiredDate - now) / (1000 * 60 * 60 * 24);

        badge.className = 'expired-status-badge';

        if (diffDays < 0) {
            badge.textContent = 'Expired';
            badge.classList.add('badge-inline-expired');
        } else if (diffDays <= 90) {
            badge.textContent = '≤ 3 Bulan';
            badge.classList.add('badge-inline-warning');
        } else {
            badge.textContent = 'Aman';
            badge.classList.add('badge-inline-safe');
        }
    });
}

window.addEventListener('DOMContentLoaded', renderInlineExpiredStatus);

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const msg    = params.get("msg");

    if (!status) return;

    let config = {
        confirmButtonColor: "#3085d6"
    };

    switch (status) {
        case "success":
            config = {
                icon: "success",
                title: "Berhasil!",
                text: "Berhasil Disimpan!",
                timer: 1800,
                showConfirmButton: false
            };
            break;

        case "error":
            config = {
                icon: "error",
                title: "Gagal!",
                text: getErrorMessage(msg)
            };
            break;
    }

    Swal.fire(config).then(() => {
        // bersihin URL biar gak ke-trigger ulang pas refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    });
});

function getErrorMessage(code) {
    switch (code) {
        case "data_tidak_lengkap":
            return "Data belum lengkap.";
        case "format_gambar":
            return "Format gambar tidak didukung.";
        case "upload_gagal":
            return "Upload gambar gagal.";
        case "db_error":
            return "Terjadi kesalahan database.";
        case "invalid_request":
            return "Request tidak valid.";
        default:
            return "Terjadi kesalahan. Silakan coba lagi.";
    }
}