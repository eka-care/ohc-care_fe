import federation from "@originjs/vite-plugin-federation";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export default defineConfig({
  plugins: [
    federation({
      name: "care_vaarta",
      filename: "remoteEntry.js",
      exposes: { "./manifest": "./src/manifest.tsx" },
      shared: ["react", "react-dom"],
    }),
    react(),
  ],
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: { main: "./src/index.ts" },
      output: {
        format: "esm",
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 5180, host: "0.0.0.0", cors: true, headers: corsHeaders },
  preview: { port: 5180, host: "0.0.0.0", cors: true, headers: corsHeaders },
});
