const CACHE = "gm-v1";

self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        // KODE BARU (ap-mbl.js)
        caches.open(CACHE).then(cache => {
            return cache.addAll([
                "./",             // Menggunakan titik (./) agar relatif
                "./index.php",    // Daftarkan secara eksplisit
                "manifest.json"
            ]);
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", event => {
    // Mengecek apakah request bertujuan untuk mengambil file dinamis atau API
    if (event.request.url.includes('.php') || event.request.method === 'POST') {
        // Strategi Network-First untuk PHP & API dinamis
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        // Strategi Cache-First untuk aset statis (CSS, JS, Gambar, Font)
        event.respondWith(
            caches.match(event.request).then(res => {
                return res || fetch(event.request);
            })
        );
    }
});