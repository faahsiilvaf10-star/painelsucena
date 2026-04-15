self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey).catch(() => false)));

      await self.clients.claim();

      const controlledClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      await self.registration.unregister();

      await Promise.all(
        controlledClients.map((client) => {
          if (typeof client.navigate !== "function") {
            return Promise.resolve();
          }

          try {
            const clientUrl = new URL(client.url);
            clientUrl.searchParams.set("app-sw-reset", `${Date.now()}`);
            return client.navigate(clientUrl.toString());
          } catch {
            return Promise.resolve();
          }
        }),
      );
    })(),
  );
});