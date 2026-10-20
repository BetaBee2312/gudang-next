const wrapper = document.getElementById("select-all-wrapper");
const checkbox = document.getElementById("select-all");

checkbox.addEventListener("change", () => {
    wrapper.classList.toggle("active", checkbox.checked);
});

// ===============================
// BRIDGE MOBILE BUTTONS
// ===============================

document.getElementById('edit-massal-mobile')
    .addEventListener('click', () => {
        document.getElementById('edit-massal-desktop').click();
    });

document.getElementById('hapus-massal-mobile')
    .addEventListener('click', () => {
        document.getElementById('hapus-massal-desktop').click();
    });

document.getElementById('alokasi-massal-mobile')
    .addEventListener('click', () => {
        document.getElementById('alokasi-massal-desktop').click();
    });
function syncButtons(disabled) {
    document.getElementById('edit-massal-desktop').disabled = disabled;
    document.getElementById('hapus-massal-desktop').disabled = disabled;
    document.getElementById('alokasi-massal-desktop').disabled = disabled;

    document.getElementById('edit-massal-mobile').disabled = disabled;
    document.getElementById('hapus-massal-mobile').disabled = disabled;
    document.getElementById('alokasi-massal-mobile').disabled = disabled;
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Set input bulan-export ke bulan ini (Format: YYYY-MM)
    const monthInput = document.getElementById('bulan-export');
    if (monthInput) {
        const today = new Date();
        const year = today.getFullYear();
        // getMonth() dimulai dari 0, jadi ditambah 1. padStart memastikan format 2 digit (contoh: '08')
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        
        monthInput.value = `${year}-${month}`;
    }

    // 2. Refresh feather icons (pastikan feather.js dipanggil)
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("ap-mbl.js");
}

let deferredPrompt;

const installBtn = document.getElementById("installAppBtn");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();

    deferredPrompt = e;

    installBtn.hidden = false;

    if (window.feather) feather.replace();
});

installBtn.addEventListener("click", async () => {

    if (!deferredPrompt) {

        alert("Browser belum menganggap website ini bisa di-install.");

        return;
    }

    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    console.log(outcome);

    deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
    installBtn.style.display = "none";
});

if (window.matchMedia("(display-mode: standalone)").matches) {
    installBtn.style.display = "none";
}