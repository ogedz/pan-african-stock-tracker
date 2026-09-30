import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        portfolio: resolve(__dirname, "src/pages/portfolio/index.html"),
        watchlist: resolve(__dirname, "src/pages/watchlist/index.html"),
        stock: resolve(__dirname, "src/pages/stock/index.html"),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  preview: {
    port: 4173,
    open: true,
  },
});