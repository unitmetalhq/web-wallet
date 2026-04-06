import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
