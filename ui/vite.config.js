import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "../server/static",
        rollupOptions: {
            treeshake: true, // Ensure tree shaking is enabled
        },
    },
    server: {
        open: true, // Automatically open the app in the browser on server start
        hmr: true,
    },
    esbuild: {
        sourcemap: true, // Ensures source maps are generated in development mode
    },
});
