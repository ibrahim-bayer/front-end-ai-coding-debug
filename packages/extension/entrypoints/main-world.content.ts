// This script runs in the MAIN world (same JS context as the page).
// It can intercept console calls and catch runtime errors.
// It communicates with the ISOLATED content script via window.postMessage.

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const SOURCE = "chrome2code-main";

    function post(event: Record<string, unknown>): void {
      window.postMessage({ source: SOURCE, event }, "*");
    }

    // --- Error capture ---
    window.addEventListener("error", (e) => {
      post({
        category: "error",
        type: e.error?.constructor?.name ?? "Error",
        timestamp: new Date().toISOString(),
        message: e.message,
        stack: e.error?.stack,
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      post({
        category: "error",
        type: reason?.constructor?.name ?? "UnhandledRejection",
        timestamp: new Date().toISOString(),
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
      });
    });

    // --- Console capture ---
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = function (...args: unknown[]) {
      post({
        category: "console",
        type: "log",
        timestamp: new Date().toISOString(),
        message: args.map(String).join(" "),
      });
      originalLog(...args);
    };

    console.warn = function (...args: unknown[]) {
      post({
        category: "console",
        type: "warn",
        timestamp: new Date().toISOString(),
        message: args.map(String).join(" "),
      });
      originalWarn(...args);
    };

    console.error = function (...args: unknown[]) {
      const message = args.map(String).join(" ");
      // Log as console event
      post({
        category: "console",
        type: "error",
        timestamp: new Date().toISOString(),
        message,
      });
      // Also capture as error (React hydration warnings, framework errors, etc.)
      post({
        category: "error",
        type: "ConsoleError",
        timestamp: new Date().toISOString(),
        message,
      });
      originalError(...args);
    };
  },
});
