import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  entrypointsDir: "entrypoints",
  outDir: "dist",
  manifest: {
    name: "Chrome2Code",
    description: "Capture browser errors, network failures, and user actions for debugging with Claude Code",
    version: "0.1.0",
    permissions: [
      "storage",
      "activeTab",
      "webRequest",
    ],
    host_permissions: ["<all_urls>"],
  },
});
