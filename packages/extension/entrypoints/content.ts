import { ActionType } from "@/lib/types";
import { MessageType } from "@/lib/messages";
import { getSelector, getElementText, getFieldName } from "@/lib/selectors";
import type { Action } from "@/lib/types";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    let lastUrl = location.href;

    function sendAction(action: Action): void {
      try {
        browser.runtime.sendMessage({
          type: MessageType.ACTION,
          payload: action,
        });
      } catch {
        // Extension context may be invalidated — fail silently
      }
    }

    function sendError(entry: { message: string; stack?: string; type: string }): void {
      try {
        browser.runtime.sendMessage({
          type: MessageType.ERROR,
          payload: { ...entry, timestamp: new Date().toISOString() },
        });
      } catch {
        // Fail silently
      }
    }

    function sendConsoleLog(text: string): void {
      try {
        browser.runtime.sendMessage({
          type: MessageType.CONSOLE_LOG,
          payload: text,
        });
      } catch {
        // Fail silently
      }
    }

    // --- Click capture ---
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target as Element;
        if (!target) return;
        sendAction({
          type: ActionType.CLICK,
          timestamp: new Date().toISOString(),
          target: getSelector(target),
          text: getElementText(target),
        });
      },
      true,
    );

    // --- Input capture ---
    document.addEventListener(
      "change",
      (e) => {
        const target = e.target as Element;
        if (!target) return;
        sendAction({
          type: ActionType.INPUT,
          timestamp: new Date().toISOString(),
          target: getSelector(target),
          field: getFieldName(target),
        });
      },
      true,
    );

    // --- Form submit capture ---
    document.addEventListener(
      "submit",
      (e) => {
        const target = e.target as Element;
        if (!target) return;
        sendAction({
          type: ActionType.SUBMIT,
          timestamp: new Date().toISOString(),
          target: getSelector(target),
        });
      },
      true,
    );

    // --- Navigation capture (SPA route changes) ---
    function checkNavigation(): void {
      if (location.href !== lastUrl) {
        const from = lastUrl;
        lastUrl = location.href;
        sendAction({
          type: ActionType.NAVIGATE,
          timestamp: new Date().toISOString(),
          from,
          to: lastUrl,
        });
      }
    }

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
      originalPushState(...args);
      checkNavigation();
    };

    history.replaceState = function (...args) {
      originalReplaceState(...args);
      checkNavigation();
    };

    window.addEventListener("popstate", checkNavigation);
    window.addEventListener("hashchange", checkNavigation);

    // --- Error capture ---
    window.addEventListener("error", (e) => {
      sendError({
        message: e.message,
        stack: e.error?.stack,
        type: e.error?.constructor?.name ?? "Error",
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      sendError({
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
        type: reason?.constructor?.name ?? "UnhandledRejection",
      });
    });

    // --- Console capture ---
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = function (...args: unknown[]) {
      sendConsoleLog(args.map(String).join(" "));
      originalLog(...args);
    };

    console.warn = function (...args: unknown[]) {
      sendConsoleLog(`[WARN] ${args.map(String).join(" ")}`);
      originalWarn(...args);
    };

    console.error = function (...args: unknown[]) {
      const message = args.map(String).join(" ");
      sendConsoleLog(`[ERROR] ${message}`);
      // Also capture console.error as an error entry (catches React hydration warnings,
      // framework errors, and other issues logged via console.error but not thrown)
      sendError({
        message,
        type: "ConsoleError",
      });
      originalError(...args);
    };
  },
});
