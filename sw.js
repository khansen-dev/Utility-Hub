/* Utility Hub — Service Worker
   Formål: la selve sidelastingen fungere offline (løser "Safari kan ikke åpne
   siden fordi iPhonen mangler internettforbindelse"). Rører BARE selve
   HTML-siden — Firebase-kall, CDN-skript (xlsx/docx) og alt annet nettverk
   går rett gjennom, uendret, slik at sky-synk og gjenoppkobling fortsatt
   fungerer nøyaktig som før. */

var CACHE_NAME = "utility-hub-shell-v1";

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // registration.scope peker på mappen appen faktisk ligger i,
      // uavhengig av eksakt filnavn — cacher siden som faktisk lastet SW-en
      return cache.add(self.registration.scope);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Rør ALDRI noe annet enn selve sidenavigasjonen — Firebase-API-kall,
  // Firestore, CDN-biblioteker (xlsx/docx) osv. går uendret rett til nettverket.
  if (req.method !== "GET" || req.mode !== "navigate") return;

  event.respondWith(
    fetch(req)
      .then(function (res) {
        // Online: bruk ferskt innhold, og oppdater cachen stille i bakgrunnen
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(self.registration.scope, copy); });
        return res;
      })
      .catch(function () {
        // Offline: server den sist cachede versjonen av siden i stedet for
        // Safaris "mangler internettforbindelse"-feilside
        return caches.match(self.registration.scope).then(function (cached) {
          return cached || Response.error();
        });
      })
  );
});
