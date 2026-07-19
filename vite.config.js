import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the client runs on 5173 and the API on 8600. Proxying keeps
// them same-origin so the session cookie works exactly as it does in
// production behind Caddy — no CORS, no SameSite surprises.
const API = process.env.HISAR_DEV_API || "http://127.0.0.1:8600";
const proxied = ["/auth", "/files", "/deposit", "/drive", "/health"];

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: Object.fromEntries(
      proxied.map((path) => [path, { target: API, changeOrigin: false }])
    ),
  },
});
