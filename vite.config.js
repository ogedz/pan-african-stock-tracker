import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        stock: resolve(__dirname, "src/stock/index.html"),
        portfolio: resolve(__dirname, "src/portfolio/index.html"),
        watchlist: resolve(__dirname, "src/watchlist/index.html"),
        alerts: resolve(__dirname, "src/alerts/index.html"),
        settings: resolve(__dirname, "src/settings/index.html"),
      },
    },
  },
});
