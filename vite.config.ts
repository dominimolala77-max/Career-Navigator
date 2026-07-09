import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0", // Allow LAN access for mobile testing
    proxy: {
      // Proxy Yoco API calls to the backend server
      // This enables mobile devices to reach the Yoco server through the Vite dev server
      "/yoco": {
        target: "http://localhost:4242",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
    proxy: {
      "/yoco": {
        target: "http://localhost:4242",
        changeOrigin: true,
      },
    },
  },
});
