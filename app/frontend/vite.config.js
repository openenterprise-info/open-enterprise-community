import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";

const { version } = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));

function readEnvVar(key, fallback) {
  try {
    const content = readFileSync(resolve(__dirname, "../server/.env"), "utf-8");
    const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
    return match ? match[1].trim() : fallback;
  } catch {
    return fallback;
  }
}

const FRONTEND_PORT = parseInt(readEnvVar("FRONTEND_PORT", "3000"));
const SERVER_PORT   = parseInt(readEnvVar("SERVER_PORT", "3001"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: FRONTEND_PORT,
    proxy: {
      "/api": { target: `http://localhost:${SERVER_PORT}`, changeOrigin: true }
    }
  }
});
