import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** `/` locally and on a user site (`*.github.io`). Project pages need `/repo-name/`. */
function siteBase(): string {
  const raw = (process.env.VITE_BASE ?? "/").trim();
  if (!raw || raw === "/") return "/";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}

export default defineConfig({
  base: siteBase(),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
