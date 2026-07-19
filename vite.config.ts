import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  base: "/sacra-v2/",
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    // Compatibilidade com aparelhos antigos (iOS 12+/Android antigos). Sem isso o
    // Vite gera sintaxe moderna (?., ??) que quebra em navegadores velhos = tela
    // branca + erro de JS (o que a Clarity flagrou). Só adiciona compat, não quebra os novos.
    target: ["es2019", "safari12", "chrome79", "firefox68", "edge79"],
    rollupOptions: {
      output: {
        // Separa os vendors pesados em arquivos próprios: baixam em PARALELO no 3G
        // (em vez de um bundle serial) e ficam em cache entre sessões.
        manualChunks: {
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-motion": ["framer-motion"],
          "vendor-react": ["react", "react-dom"],
        },
      },
    },
  },
});
