import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["og-image.png", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-192x192.png", "pwa-maskable-512x512.png"],
      manifest: {
        name: "Sucena Empreendimentos - Controle Operacional",
        short_name: "Painel Sucena",
        description: "Sistema de controle operacional para gestão eficiente de empresas. Gerencie equipamentos, presença, atividades, documentos e muito mais.",
        theme_color: "#1a1a2e",
        background_color: "#0f0f23",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone", "minimal-ui"],
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        id: "/",
        dir: "ltr",
        lang: "pt-BR",
        categories: ["business", "productivity", "utilities"],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: ["navigate-existing", "auto"],
        },
        handle_links: "preferred",
        share_target: {
          action: "/share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "media",
                accept: ["image/*", "application/pdf"],
              },
            ],
          },
        },
        protocol_handlers: [
          {
            protocol: "web+painelsucena",
            url: "/%s",
          },
        ],
        file_handlers: [
          {
            action: "/",
            accept: {
              "image/*": [".png", ".jpg", ".jpeg", ".webp"],
              "application/pdf": [".pdf"],
            },
          },
        ],
        edge_side_panel: {
          preferred_width: 400,
        },
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/screenshot-mobile.jpg",
            sizes: "540x960",
            type: "image/jpeg",
            form_factor: "narrow",
            label: "Dashboard Mobile - Painel Sucena",
          },
          {
            src: "/screenshots/screenshot-desktop.jpg",
            sizes: "1920x1080",
            type: "image/jpeg",
            form_factor: "wide",
            label: "Dashboard Desktop - Painel Sucena",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/dashboard",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Presença",
            short_name: "Presença",
            url: "/presenca",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Equipamentos",
            short_name: "Equipamentos",
            url: "/entrada-saida-equipamentos",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Desvios",
            short_name: "Desvios",
            url: "/desvios",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg,webp}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB limit
        navigateFallbackDenylist: [/^\/~oauth/],
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^(?!\/(~oauth|api|supabase))/],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Google Fonts - Cache First (rarely changes)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts Static - Cache First
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-static",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Image Assets - Stale While Revalidate
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Supabase Storage - Network First with Fallback
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
