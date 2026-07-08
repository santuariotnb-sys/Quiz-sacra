import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@prod": path.resolve(__dirname, "../src") } },
  build: { target: "es2018" },
});
