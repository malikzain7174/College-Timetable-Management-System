import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const base = env.VITE_API_BASE_URL?.trim();
    if (command === "build" && env.VERCEL && !base) {
        throw new Error("Set VITE_API_BASE_URL to the hosted API origin for Vercel builds.");
    }
    if (base && !/^https?:\/\/[^/]+\/?$/.test(base)) {
        throw new Error("VITE_API_BASE_URL must be an HTTP or HTTPS origin.");
    }

    const target = env.API_PROXY_TARGET || "http://127.0.0.1:5000";
    const proxy = { "/api": target, "/health": target };
    return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
