import {defineConfig} from "vitest/config";

const SPEC = "*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

export default defineConfig({
    test: {
        globals: true,           // describe/it/expect sans import
        environment: "jsdom",    // simule le DOM pour les futures fenêtres/sheets
        include: [`tests/**/${SPEC}`],
        exclude: ["**/node_modules/**", "**/.claude/**"],
        setupFiles: ["./tests/setup.js"],
        testTimeout: 20000,
        coverage: {
            provider: "v8", reporter: ["text", "html"], include: ["src/**/*.js"],
        }
    }
});
