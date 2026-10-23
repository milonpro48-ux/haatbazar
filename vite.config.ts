import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/haatbazar/" : "/",
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } }
});
