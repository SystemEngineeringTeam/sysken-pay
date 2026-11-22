import { defineConfig } from "vitest/config";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // どこに置いても動くように、読み込みは相対パスにする
  base: "./",
  build: { target: "es2020" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  plugins: [cloudflare()],
});