import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-dom/client"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3100",
      "/callbacks": "http://127.0.0.1:3100",
    },
  },
});
