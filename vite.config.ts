import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // In dev, /api goes to hookline-api through a running stack's web container.
    proxy: {
      "/api": process.env.HOOKLINE_API_PROXY || "http://localhost:7070",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          "ui-vendor": [
            "@radix-ui/react-toast",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
          ],
          // Appwrite chunk
          appwrite: ["appwrite"],
        },
      },
    },
    // Increase chunk size warning limit to 600kb
    chunkSizeWarningLimit: 600,
  },
});
