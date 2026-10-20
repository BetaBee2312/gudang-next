let checkedState = {}; // state checkbox
const checkboxes = document.querySelectorAll(".hapus-checkbox");

const hapusBtns = [
    document.getElementById("hapus-massal-fab"),
    document.getElementById("hapus-massal-desktop"),
    document.getElementById("hapus-massal-mobile") // ✅ tambah ini
];

const editBtns = [
    document.getElementById("edit-massal-fab"),
    document.getElementById("edit-massal-desktop"),
    document.getElementById("edit-massal-mobile") // ✅
];

const alokasiBtns = [
    document.getElementById("alokasi-massal-fab"),
    document.getElementById("alokasi-massal-desktop"),
    document.getElementById("alokasi-massal-mobile") // ✅
];

const fabContainer = document.getElementById("fab-container");
const fabMain = document.getElementById("fab-main");

const selectAll = document.getElementById("select-all");

const getVisibleCheckboxes = () =>
    Array.from(document.querySelectorAll(".hapus-checkbox"))
        .filter(cb => {
            const column = cb.closest(".column");
            return column && window.getComputedStyle(column).display !== "none";
        });

/* --- UPDATE BUTTON STATE --- */
function updateButtons() {
    const anyChecked = document.querySelectorAll(".hapus-checkbox:checked").length > 0;

    hapusBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
    editBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
    alokasiBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
}

/* --- CENTRALIZED EVENT HANDLER --- */
document.addEventListener("change", (e) => {

    // SELECT ALL CLICK
    if (e.target.id === "select-all") {
        const isChecked = e.target.checked;

        getVisibleCheckboxes().forEach(cb => {
            cb.checked = isChecked;
        });
    }

    // INDIVIDUAL CHECKBOX CLICK
    if (e.target.classList.contains("hapus-checkbox")) {
        const visible = getVisibleCheckboxes();

        if (selectAll) {
            selectAll.checked =
                visible.length > 0 &&
                visible.every(cb => cb.checked);
        }
    }

    updateButtons();
});

/* --- INIT STATE --- */
function initSelectAllState() {
    const visible = getVisibleCheckboxes();

    if (selectAll) {
        selectAll.checked =
            visible.length > 0 &&
            visible.every(cb => cb.checked);
    }
}

initSelectAllState();

function updateButtons() {
    const anyChecked = document.querySelectorAll(".hapus-checkbox:checked").length > 0;
    hapusBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
    editBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
    alokasiBtns.forEach(btn => btn && (btn.disabled = !anyChecked));
}

/* --- SEARCH BAR --- */
$(document).ready(function() {
    function filterCards() {
        const searchFilter = ($('#search-bar').val() || '').toLowerCase().trim();
        const kategoriFilter = ($('#kategori-filter').val() || '').toLowerCase().trim();

        $('#cards-container .card').each(function() {
            const nama = ($(this).data('nama') || '').toLowerCase().trim();
            const kategoriBarang = ($(this).data('kategori') || '').toLowerCase().trim();
            const matchSearch = !searchFilter || nama.includes(searchFilter);
            const matchKategori = kategoriFilter === 'ascending' ? true : kategoriBarang === kategoriFilter;

            $(this).toggle(matchSearch && matchKategori);
        });
    }

    $('#search-bar').on('input', filterCards);
    $('#kategori-filter').on('change', filterCards);
    filterCards(); 
});

/* --- HANDLE HAPUS MASSAL --- */
hapusBtns.forEach(hapusBtn => {
    if (!hapusBtn) return;
    hapusBtn.addEventListener("click", () => {
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

        if (!selectedIds.length) {
            Swal.fire({ icon: "warning", title: "Peringatan", text: "Pilih minimal satu barang untuk dihapus." });
            return;
        }

        const selectedNamesList = `
        <div class="content has-text-left" style="max-height: 200px; overflow-y: auto;">
            <ul style="margin-left: 1.5rem;">
                ${selectedIds.map(id => {
                    const card = document.querySelector(`.card[data-id="${id}"]`);
                    const name = card?.getAttribute("title") || `ID ${id}`;
                    return `<li>${name}</li>`;
                }).join("")}
            </ul>
        </div>`;

        Swal.fire({
            title: "Hapus Barang?",
            html: selectedNamesList,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal",
            confirmButtonColor: '#d33',
            reverseButtons: true
        }).then(result => {
            if (!result.isConfirmed) return;
            // Simulasi fetch success (Ganti dengan fetch asli Anda)
            fetch("hapus-massal.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    Swal.fire("Sukses", "Barang berhasil dihapus.", "success").then(() => location.reload());
                } else {
                    Swal.fire("Gagal", data.message, "error");
                }
            })
            .catch(() => Swal.fire("Error", "Gagal koneksi server.", "error"));
        });
    });
});

/* --- HANDLE EDIT MASSAL --- */
editBtns.forEach(editBtn => {
    if(!editBtn) return;
    editBtn.addEventListener("click", () => {
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (!selectedIds.length) {
            Swal.fire("Peringatan", "Pilih minimal satu barang untuk diedit.", "warning");
            return;
        }

        fetch("edit-massal.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedIds })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") openEditMassalModal(data.items);
            else Swal.fire("Error", data.message, "error");
        })
        .catch(() => Swal.fire("Error", "Gagal memuat data.", "error"));
    });
});

/* --- OPEN EDIT MASSAL MODAL (RESPONSIVE FIX) --- */
function openEditMassalModal(items) {
    const existing = document.getElementById("edit-massal-modal");
    if (existing) existing.remove();

    // Perubahan: Hapus style width inline, gunakan class modal-card full
    let html = `
    <div id="edit-massal-modal" class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title is-size-5-mobile">Edit Massal</p>
                <button class="delete" aria-label="close" onclick="closeEditMassalModal()"></button>
            </header>

            <section class="modal-card-body">
                <form id="edit-massal-form" enctype="multipart/form-data">
    `;

    items.forEach(item => {
        // Perubahan: Layout kolom diperbaiki agar stack di mobile
        html += `
        <div class="box mb-5 has-background-white-ter">
            <h3 class="title is-6 has-text-link mb-3">
                ${item.nama_barang} 
                <span class="tag is-light is-rounded ml-2">${item.id_barang}</span>
            </h3>

            <div class="columns is-multiline is-mobile">
                <div class="column is-12-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">PLU</label>
                        <div class="control">
                            <input class="input" type="text" name="plu[${item.id_barang}]" value="${item.plu ?? ''}">
                        </div>
                    </div>
                </div>

                <div class="column is-12-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">Nama Barang</label>
                        <div class="control">
                            <input class="input" type="text" name="nama_barang[${item.id_barang}]" value="${item.nama_barang}">
                        </div>
                    </div>
                </div>

                <div class="column is-12-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">Kategori</label>
                        <div class="control">
                            <input class="input is-static" type="text" readonly value="${item.kategori}">
                            <input type="hidden" name="kategori[${item.id_barang}]" value="${item.kategori}">
                        </div>
                    </div>
                </div>

                <div class="column is-12-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">Expired</label>
                        <div class="control">
                            <input class="input" type="date" name="expired[${item.id_barang}]" value="${item.expired ?? ''}">
                        </div>
                    </div>
                </div>

                <div class="column is-6-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">Qty Awal</label>
                        <div class="control">
                            <input class="input" type="number" name="qty_awal[${item.id_barang}]" value="${item.qty_awal}">
                        </div>
                    </div>
                </div>

                <div class="column is-6-mobile is-4-tablet">
                    <div class="field">
                        <label class="label is-small">Qty Kini</label>
                        <div class="control">
                            <input class="input" type="number" name="qty_terkini[${item.id_barang}]" value="${item.qty_terkini}">
                        </div>
                    </div>
                </div>

                <div class="column is-12">
                    <div class="field">
                        <label class="label is-small">Gambar</label>
                        <div class="file is-small is-fullwidth">
                            <label class="file-label">
                                <input class="file-input" type="file" name="gambar[${item.id_barang}]">
                                <span class="file-cta">
                                    <span class="file-label">Pilih Gambar...</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    html += `
                </form>
            </section>
            <footer class="modal-card-foot is-justify-content-flex-end">
                <button class="button" onclick="closeEditMassalModal()">Batal</button>
                <button class="button is-link" id="submit-edit-massal">Simpan</button>
            </footer>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    // Handler Submit
    document.getElementById("submit-edit-massal").addEventListener("click", () => {
        const form = document.getElementById("edit-massal-form");
        const formData = new FormData(form);

        fetch("update-massal.php", { method: "POST", body: formData })
            .then(res => res.json())
            .then(data => {
                closeEditMassalModal();
                if (data.status === "success") {
                    Swal.fire({ icon: "success", title: "Sukses", text: "Update berhasil", timer: 1500, showConfirmButton: false })
                    .then(() => location.reload());
                } else {
                    Swal.fire("Gagal", data.message, "error");
                }
            })
            .catch(() => Swal.fire("Error", "Server error", "error"));
    });
}

function closeEditMassalModal() {
    const modal = document.getElementById("edit-massal-modal");
    if (modal) modal.remove();
}

/* --- ALOKASI MASSAL CONFIG --- */
const cabangTomSelectConfig = {
    valueField: 'kode_cabang',
    labelField: 'nama_cabang',
    searchField: ['nama_cabang', 'singkatan'],
    preload: true,
    load: function(query, callback) {
        fetch('get-cabang.php?q=' + encodeURIComponent(query))
            .then(res => res.json())
            .then(json => callback(json))
            .catch(() => callback());
    },
    render: {
        option: (item) => `<div class="py-2"><strong>${item.singkatan}</strong> <br><small>${item.nama_cabang}</small></div>`,
        item: (item) => `<div>${item.singkatan}</div>`
    }
};

/* --- HANDLE ALOKASI MASSAL --- */
alokasiBtns.forEach(btn => {
    if(!btn) return;
    btn.addEventListener("click", () => {
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (!selectedIds.length) {
            Swal.fire("Peringatan", "Pilih minimal satu barang.", "warning");
            return;
        }
        openAlokasiMassalModal(selectedIds);
    });
});

// Variable global untuk cache data cabang agar tidak fetch berulang kali
let cachedCabangOptions = null;

async function openAlokasiMassalModal(ids) {
    // 1. Ambil data pendukung secara paralel agar cepat
    const [namaPemohon, cabangData] = await Promise.all([
        fetch("nama-pemohon.php").then(r => r.json()).catch(() => ({})),
        cachedCabangOptions ? Promise.resolve(cachedCabangOptions) : fetch("get-cabang-data.php").then(r => r.json()).catch(() => [])
    ]);
    
    cachedCabangOptions = cabangData; // Simpan ke cache
    const pemohon = namaPemohon.status === "success" ? namaPemohon.nama : "";

    // 2. Buat Skeleton Modal
    const modal = document.createElement("div");
    modal.className = "modal is-active";
    modal.innerHTML = `
        <div class="modal-background"></div>
        <div class="modal-card" style="width: 95%; max-width: 800px; height: 95vh;">
            <header class="modal-card-head has-background-white border-bottom">
                <p class="modal-card-title is-size-5-mobile has-text-weight-bold">Alokasi Barang</p>
                <button class="delete close-modal" type="button"></button>
            </header>
            <form id="alokasi-massal-form" action="alokasi-massal.php" method="POST" style="overflow-y: auto;">
                <section class="modal-card-body p-3-mobile">
                    <div id="alokasi-items-container"></div>
                </section>
                <footer class="modal-card-foot has-background-white p-4" style="display: block;">
                    <div class="columns is-vcentered m-0" style="width: 100%;">
                        
                        <div class="column is-6-tablet is-12-mobile pb-2">
                            <label class="label is-small has-text-grey mb-0">Pemohon</label>
                            <input type="text" class="input is-static is-small p-0 has-text-weight-semibold" name="nama_pemohon" value="${pemohon}" readonly>
                        </div>
                        
                        <div class="column is-6-tablet is-12-mobile is-flex is-justify-content-flex-end">
                            <div class="is-flex w-full" style="gap: 10px; width: 100%;">
                                <button type="button" class="button close-modal" style="flex: 1;">
                                    Batal
                                </button>
                                <button type="submit" class="button is-link" style="flex: 1;">
                                    Simpan
                                </button>
                            </div>
                        </div>

                    </div>
                </footer>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // 3. Build HTML Items secara masal (Performance Boost)
    const container = modal.querySelector("#alokasi-items-container");
    let allItemsHTML = "";

    ids.forEach(id => {
        const cardOrigin = document.querySelector(`.hapus-checkbox[value="${id}"]`)?.closest(".card");
        const namaBarang = cardOrigin?.querySelector(".nama-barang")?.innerText || "Barang";
        const stokRaw = cardOrigin?.querySelector("p:nth-of-type(2)")?.innerText || "0";
        const stok = parseInt(stokRaw.replace(/\D/g, '')) || 0;

        allItemsHTML += `
        <div class="product-box mb-5" data-id="${id}" data-stok="${stok}">
            
            <!-- HEADER -->
            <div class="box p-0" style="border-radius:12px; overflow:hidden; border:1px solid #eee;">
                
                <div class="is-flex is-justify-content-space-between is-align-items-center px-4 py-3"
                    style="background: linear-gradient(135deg,#f5f7fa,#eef1f5);">
                    
                    <div>
                        <p class="has-text-weight-semibold mb-1">${namaBarang}</p>
                        <p class="is-size-7 has-text-grey">ID: ${id}</p>
                    </div>

                    <span class="tag is-medium is-link is-light has-text-weight-semibold">
                        ${stok} stok
                    </span>
                </div>

                <!-- BODY -->
                <div class="p-4">
                    <input type="hidden" name="id_barang[]" value="${id}">
                    
                    <div class="field-container"></div>

                    <!-- BUTTON -->
                    <button type="button" 
                        class="button is-small is-fullwidth mt-4 add-row-btn"
                        style="border-radius:8px; border:1px dashed #ccc;">
                        
                        <span class="icon is-small"><i data-feather="plus"></i></span>
                        <span>Tambah Cabang</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = allItemsHTML;

    // 4. Inisialisasi TomSelect secara Batch
    const initTomSelect = (el) => {
        if (el) new TomSelect(el, { ...cabangTomSelectConfig, options: cachedCabangOptions });
    };
    modal.querySelectorAll(".cabang-select").forEach(initTomSelect);
    if (typeof feather !== 'undefined') feather.replace();

    // 5. EVENT DELEGATION (Handle klik untuk seluruh modal)
    modal.addEventListener("click", (e) => {
        // Handle Close
        if (e.target.closest(".close-modal")) {
            modal.remove();
            return;
        }

        // Handle Tambah Baris
        const addBtn = e.target.closest(".add-row-btn");
        if (addBtn) {
            const box = addBtn.closest(".product-box");
            const rowContainer = box.querySelector(".field-container");
            const newRow = document.createElement("div");
            newRow.innerHTML = renderRow(box.dataset.id, box.dataset.stok, true);
            rowContainer.appendChild(newRow);
            
            initTomSelect(newRow.querySelector(".cabang-select"));
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        // Handle Hapus Baris
        const delBtn = e.target.closest(".remove-row");
        if (delBtn) {
            delBtn.closest(".allocation-row").remove();
        }
    });

    // 6. Handle Submit dengan SweetAlert
    // 6. Handle Submit dengan SweetAlert 
    modal.querySelector("form").onsubmit = async (e) => { e.preventDefault(); const result = await Swal.fire({ title: "Simpan Alokasi?", text: "Pastikan data sudah benar.", icon: "question", showCancelButton: true, confirmButtonText: "Ya, Simpan" }); if (result.isConfirmed) e.target.submit(); }; }

// Helper function untuk render baris input
function renderRow(id, stok, canDelete = false) {
    return `
    <div class="allocation-row mt-3 p-3"
        style="background:#fafafa; border-radius:10px; border:1px solid #eee; position:relative;">
        
        ${canDelete ? `
        <button type="button" 
            class="delete is-small remove-row"
            style="position:absolute; right:10px; top:10px;">
        </button>` : ''}

        <div class="columns is-mobile is-variable is-2 mb-0">
            
            <!-- QTY -->
            <div class="column is-4">
                <label class="label is-size-7 has-text-grey mb-1">Qty</label>
                <input type="number"
                    class="input is-small has-text-weight-semibold"
                    name="qty_teralokasi_${id}[]"
                    min="1"
                    max="${stok}"
                    placeholder="0"
                    required>
            </div>

            <!-- CABANG -->
            <div class="column is-8">
                <label class="label is-size-7 has-text-grey mb-1">Cabang</label>
                <div class="select is-fullwidth is-small">
                    <select name="kode_cabang_${id}[]" class="cabang-select" required></select>
                </div>
            </div>

        </div>
    </div>
    `;
}

/* --- FAB TOGGLE --- */
if(fabMain && fabContainer) {
    fabMain.addEventListener("click", () => {
        fabContainer.classList.toggle("fab-open");
        const icon = fabMain.querySelector("i");
        if(fabContainer.classList.contains("fab-open")){
            icon.setAttribute("data-feather", "x");
        } else {
            icon.setAttribute("data-feather", "plus");
        }
        feather.replace();
    });
}

// Re-init feather icons
if(typeof feather !== 'undefined') feather.replace();