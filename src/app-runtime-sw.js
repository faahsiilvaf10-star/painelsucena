import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

const PREVIEW_HOST_FRAGMENTS = ["id-preview--", "lovableproject.com"];
const isPreviewRuntime = PREVIEW_HOST_FRAGMENTS.some((fragment) => self.location.hostname.includes(fragment));

self.addEventListener("install", () => {
  self.skipWaiting();
});

if (isPreviewRuntime) {
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();

        const controlledClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const cacheKeys = await self.caches.keys();
        await Promise.all(cacheKeys.map((cacheKey) => self.caches.delete(cacheKey).catch(() => false)));

        await self.registration.unregister();

        await Promise.all(
          controlledClients.map((client) => {
            if (typeof client.navigate !== "function") {
              return Promise.resolve();
            }

            try {
              const clientUrl = new URL(client.url);
              clientUrl.searchParams.set("preview-bust", `${Date.now()}`);
              return client.navigate(clientUrl.toString());
            } catch {
              return Promise.resolve();
            }
          }),
        );
      })(),
    );
  });
} else {
  clientsClaim();
  precacheAndRoute(self.__WB_MANIFEST);
  cleanupOutdatedCaches();

  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
      denylist: [/^\/~oauth/, /^\/api/, /^\/supabase/],
    }),
  );

  registerRoute(({ url }) => url.origin === "https://fonts.googleapis.com", new CacheFirst({ cacheName: "google-fonts-cache" }));

  registerRoute(({ url }) => url.origin === "https://fonts.gstatic.com", new CacheFirst({ cacheName: "google-fonts-static" }));

  registerRoute(({ request }) => request.destination === "image", new StaleWhileRevalidate({ cacheName: "image-cache" }));

  registerRoute(
    ({ url }) => /^https:\/\/.*\.supabase\.co\/storage\/.*/i.test(url.href),
    new NetworkFirst({
      cacheName: "supabase-storage",
      networkTimeoutSeconds: 5,
    }),
  );
}