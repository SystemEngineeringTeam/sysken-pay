import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import generouted from "@generouted/react-router/plugin";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    svgr({
      include: "**/*.svg?react",
    }),
    react(),
    generouted(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/scss/design-primitive" as *;
        `,
      },
    },
  },
});
