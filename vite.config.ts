/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import viteCompression from "vite-plugin-compression";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), viteCompression()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown requires a function (object form is not supported).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router-dom")
          ) {
            return "vendor";
          }
          if (
            id.includes("@radix-ui/react-accordion") ||
            id.includes("@radix-ui/react-dialog") ||
            id.includes("@radix-ui/react-popover")
          ) {
            return "ui";
          }
          if (id.includes("firebase/")) {
            return "firebase";
          }
          if (
            id.includes("chart.js") ||
            id.includes("react-chartjs-2") ||
            id.includes("/recharts/")
          ) {
            return "charts";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
}));
