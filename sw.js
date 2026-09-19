const CACHE = "pose-cognitive-trainer-v1.0.0";
const AUDIO_FILES = ["en", "he"].flatMap(language => [
  ...Array.from({ length: 10 }, (_, index) => `./audio/${language}/number-${index + 1}.mp3`),
  `./audio/${language}/switchCommand.mp3`,
  `./audio/${language}/finished.mp3`
]);
const APP_FILES = ["./", "./index.html", "./styles.css?v=1.0.0", "./app.js?v=1.0.0", "./core.mjs", "./manifest.webmanifest", "./icons/icon.svg", ...AUDIO_FILES];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html"))));
});
