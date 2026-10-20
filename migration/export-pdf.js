/* ============================================================
   DESIGN SYSTEM — injected once on load
   Theme: Industrial Precision / Dark Slate + Amber Accent
   ============================================================ */
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg:        #0e0f11;
            --bg-card:   #16181c;
            --bg-hover:  #1e2026;
            --border:    #2a2d35;
            --border-hi: #3a3e4a;
            --accent:    #f5a623;
            --accent-dim:#7a4e0e;
            --accent-fg: #fff8ec;
            --text:      #e8eaf0;
            --text-muted:#7a7f8e;
            --text-dim:  #4a4f5c;
            --success:   #2dd4a0;
            --danger:    #f05252;
            --radius:    10px;
            --radius-lg: 16px;
            --font-head: 'Syne', sans-serif;
            --font-body: 'DM Sans', sans-serif;
            --font-mono: 'DM Mono', monospace;
            --shadow:    0 4px 24px rgba(0,0,0,0.45);
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: var(--font-body);
            font-size: 15px;
            line-height: 1.6;
            min-height: 100vh;
        }

        /* ── NAV / HEADER ── */
        .site-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px;
            height: 64px;
            background: rgba(14,15,17,0.92);
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .site-header .brand {
            font-family: var(--font-head);
            font-weight: 800;
            font-size: 18px;
            letter-spacing: -0.5px;
            color: var(--text);
        }
        .site-header .brand span { color: var(--accent); }

        /* ── FILTER BAR ── */
        #filterBulan,
        select, input[type="text"], input[type="date"], textarea {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text);
            font-family: var(--font-body);
            font-size: 14px;
            padding: 9px 14px;
            outline: none;
            transition: border-color .18s, box-shadow .18s;
            appearance: none;
        }
        #filterBulan:focus, select:focus, input:focus, textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(245,166,35,0.15);
        }

        /* ── CARDS (serah-card) ── */
        .serah-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 20px 24px;
            margin-bottom: 16px;
            transition: border-color .2s, transform .2s, box-shadow .2s;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        .serah-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 3px;
            background: var(--accent);
            border-radius: 3px 0 0 3px;
            opacity: 0;
            transition: opacity .2s;
        }
        .serah-card:hover {
            border-color: var(--border-hi);
            transform: translateY(-2px);
            box-shadow: var(--shadow);
        }
        .serah-card:hover::before { opacity: 1; }

        /* card header row */
        .card-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
        }
        .card-title {
            font-family: var(--font-head);
            font-weight: 700;
            font-size: 16px;
            color: var(--text);
            letter-spacing: -0.3px;
        }
        .card-badge {
            font-family: var(--font-mono);
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.5px;
            padding: 3px 10px;
            border-radius: 99px;
            border: 1px solid var(--accent-dim);
            background: rgba(245,166,35,0.08);
            color: var(--accent);
            white-space: nowrap;
        }

        /* card meta row */
        .card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 20px;
            font-size: 13px;
            color: var(--text-muted);
        }
        .card-meta strong {
            color: var(--text);
            font-weight: 500;
        }

        /* detail panel */
        .card-detail {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
            animation: slideDown .2s ease;
        }
        .hidden { display: none !important; }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* ── TABLE inside detail ── */
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .detail-table th {
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: var(--text-dim);
            text-align: left;
            padding: 6px 12px;
            border-bottom: 1px solid var(--border);
        }
        .detail-table td {
            padding: 9px 12px;
            color: var(--text);
            border-bottom: 1px solid rgba(42,45,53,0.5);
            vertical-align: top;
        }
        .detail-table tr:last-child td { border-bottom: none; }
        .detail-table tr:hover td { background: var(--bg-hover); }

        /* ── BUTTONS ── */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 18px;
            font-family: var(--font-body);
            font-size: 13px;
            font-weight: 500;
            border-radius: var(--radius);
            border: 1px solid var(--border-hi);
            background: var(--bg-hover);
            color: var(--text);
            cursor: pointer;
            transition: all .18s;
            text-decoration: none;
        }
        .btn:hover {
            background: var(--border);
            border-color: var(--text-dim);
        }
        .btn-accent {
            background: var(--accent);
            border-color: var(--accent);
            color: #1a1000;
            font-weight: 600;
        }
        .btn-accent:hover {
            background: #f7b73a;
            border-color: #f7b73a;
        }
        .btn-danger {
            border-color: rgba(240,82,82,0.4);
            color: var(--danger);
        }
        .btn-danger:hover { background: rgba(240,82,82,0.1); }

        /* ── EMPTY STATE ── */
        .empty-state {
            text-align: center;
            padding: 64px 24px;
            color: var(--text-dim);
        }
        .empty-state svg { margin-bottom: 16px; opacity: .3; }
        .empty-state p { font-size: 14px; }

        /* ── FORM ELEMENTS (modal / tambah) ── */
        .form-group { margin-bottom: 18px; }
        .form-label {
            display: block;
            font-family: var(--font-mono);
            font-size: 11px;
            letter-spacing: 0.7px;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 7px;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
        }

        /* ── MODAL OVERLAY ── */
        .modal-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(4px);
            z-index: 200;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-box {
            background: var(--bg-card);
            border: 1px solid var(--border-hi);
            border-radius: var(--radius-lg);
            padding: 28px 32px;
            width: min(540px, 94vw);
            box-shadow: 0 20px 60px rgba(0,0,0,0.6);
            animation: modalIn .22s cubic-bezier(.22,1,.36,1);
        }
        @keyframes modalIn {
            from { opacity: 0; transform: scale(.95) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-title {
            font-family: var(--font-head);
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 24px;
            letter-spacing: -0.4px;
        }

        /* ── PAGE CONTAINER ── */
        .page-wrap {
            max-width: 900px;
            margin: 0 auto;
            padding: 32px 24px;
        }
        .page-title {
            font-family: var(--font-head);
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.8px;
            margin-bottom: 4px;
        }
        .page-sub {
            color: var(--text-muted);
            font-size: 14px;
            margin-bottom: 28px;
        }

        /* ── FILTER ROW ── */
        .filter-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .filter-row label {
            font-size: 13px;
            color: var(--text-muted);
            white-space: nowrap;
        }

        /* ── TOAST ── */
        #toast-container {
            position: fixed;
            bottom: 28px; right: 28px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            background: var(--bg-card);
            border: 1px solid var(--border-hi);
            border-left: 3px solid var(--accent);
            border-radius: var(--radius);
            padding: 12px 18px;
            font-size: 13px;
            color: var(--text);
            box-shadow: var(--shadow);
            animation: toastIn .25s ease;
            min-width: 220px;
        }
        .toast.success { border-left-color: var(--success); }
        .toast.danger  { border-left-color: var(--danger); }
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(20px); }
            to   { opacity: 1; transform: translateX(0); }
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

        /* ── RESPONSIVE ── */
        @media (max-width: 600px) {
            .page-wrap { padding: 20px 14px; }
            .site-header { padding: 0 16px; }
            .serah-card { padding: 16px 18px; }
            .modal-box { padding: 22px 18px; }
        }
    `;
    document.head.appendChild(style);
})();

/* ============================================================
   TOAST HELPER
   ============================================================ */
function showToast(msg, type = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

/* ============================================================
   TOGGLE DETAIL
   ============================================================ */
function toggleDetail(id) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden');
}

/* ============================================================
   PRINT PDF
   ============================================================ */
async function printPDF(date, items) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const firstItem = items[0];
    const tgl = new Date(firstItem.tanggal);
    const dayName = tgl.toLocaleDateString('id-ID', { weekday: 'long' });
    const formattedDate = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const leftX = 10;
    const rightX = pageWidth - 60;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    let y = 5;

    async function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
    }

    try {
        const logo = await loadImage('gambar/logoyomart.png');
        doc.addImage(logo, 'PNG', 10, y, 55, 12);
    } catch(e) {
        console.warn("Logo gagal load, lanjut tanpa logo");
    }

    y += 12 + 5;

    doc.text(`HARI : ${dayName.toUpperCase()}`, leftX, y);
    doc.text(`DARI : MARKETING`, rightX, y);
    y += 6;
    doc.text(`TANGGAL : ${formattedDate.toUpperCase()}`, leftX, y);
    doc.text(`UNTUK : ${firstItem.tujuan.toUpperCase()}`, rightX, y);
    y += 8;

    function parseJumlah(val) {
        const num = parseFloat(String(val).replace(',', '.').trim());
        return isNaN(num) ? 0 : num;
    }

    const tableData = [];
    items.forEach(item => {
        const cabangs = item.cabang.split(',').map(c => c.trim());
        cabangs.forEach((cabang, index) => {
            const namaCabang = cabangMap2[cabang] ?? cabang;
            tableData.push([
                index === 0 ? item.keperluan : '',
                index === 0 ? item.jumlah : '',
                namaCabang
            ]);
        });
    });

    tableData.push(['', '', '']);
    tableData.push(['', '', '']);

    doc.autoTable({
        startY: y,
        head: [['Item', 'Qty', 'Keterangan']],
        body: tableData,
        theme: 'grid',
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.3,
        headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' },
        styles: { fontSize: 9, cellPadding: 2, textColor: 0, lineWidth: 0.3, lineColor: [0,0,0], valign: 'middle' },
        tableWidth: 'full',
        columnStyles: {
            0: { halign: 'left', cellWidth: 60 },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'left' }
        },
        margin: { left: 10, right: 10 }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    const leftFooterX = 10;
    const rightFooterX = pageWidth - 45;

    doc.text("MENYERAHKAN", leftFooterX, finalY);
    doc.text("MENERIMA", rightFooterX, finalY);
    finalY += 25;
    doc.text(firstItem.nama.toUpperCase(), leftFooterX, finalY);

    const jabatanText = (['admin','creator'].includes(firstItem.jabatan.toLowerCase()))
        ? "ADM.MARKETING"
        : firstItem.jabatan;

    doc.text(jabatanText, leftFooterX, finalY + 6);
    doc.save(`Serah Terima ${formattedDate} ${firstItem.tujuan}.pdf`);

    showToast(`PDF disimpan: ${firstItem.tujuan}`, 'success');
}

/* ============================================================
   CABANG MAPS (from PHP)
   ============================================================ */
const cabangMap  = <?= json_encode($cabangList  ?? []) ?>;
const cabangMap2 = <?= json_encode($cabangList2 ?? []) ?>;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    /* Cabang select */
    document.querySelectorAll('.ts-cabang').forEach(input => initCabangSelect(input));

    /* Feather icons (fallback if still used) */
    if (window.feather) {
        feather.replace();
        const observer = new MutationObserver(() => feather.replace());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /* Filter bulan — default ke bulan sekarang */
    const filter = document.getElementById('filterBulan');
    if (!filter) return;

    const now = new Date();
    const currentMonth =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0');

    const optionExists = [...filter.options].some(opt => opt.value === currentMonth);
    if (optionExists) filter.value = currentMonth;

    filter.addEventListener('change', function () {
        const val = this.value;
        document.querySelectorAll('.serah-card[data-bulan]').forEach(card => {
            const bulan = card.getAttribute('data-bulan');
            card.style.display = (val === "" || bulan === val) ? "" : "none";
        });
    });

    filter.dispatchEvent(new Event('change'));

    /* Staggered card entrance animation */
    const cards = document.querySelectorAll('.serah-card');
    cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        card.style.transition = 'opacity .35s ease, transform .35s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 60 + i * 45);
    });
});