import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    ssr: true,
    server: { entry: "server" },
  },
  nitro: { preset: "vercel" },
});
