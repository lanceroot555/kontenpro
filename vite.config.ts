import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Note: lovable-tagger (componentTagger) only runs in dev mode — not injected in production builds
export default defineConfig({
  tanstackStart: {
    ssr: true,
    server: { entry: "server" },
  },
  nitro: { preset: "vercel" },
});
