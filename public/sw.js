// Minimal service worker — satisfies Chrome's PWA installability check.
// No caching, no offline support intended.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
