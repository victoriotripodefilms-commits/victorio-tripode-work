const CACHE='vt-work-v1';
const ASSETS=['./','index.html','styles.css','app.js','manifest.webmanifest','assets/logo-v.png','assets/logo-wordmark.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
