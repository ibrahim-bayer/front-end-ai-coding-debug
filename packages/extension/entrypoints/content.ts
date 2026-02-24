import { MessageType } from "@/lib/messages";
import { getSelector, getElementText, getFieldName } from "@/lib/selectors";
import type { TimelineEvent } from "@/lib/types";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    let lastUrl = location.href;

    function send(event: TimelineEvent): void {
      try {
        browser.runtime.sendMessage({
          type: MessageType.TIMELINE_EVENT,
          payload: event,
        });
      } catch {
        // Extension context invalidated — fail silently
      }
    }

    // --- Listen for events from MAIN world content script via CustomEvent ---
    document.addEventListener("chrome2code-event", (e) => {
      try {
        const event = JSON.parse((e as CustomEvent).detail as string) as TimelineEvent;
        send(event);
      } catch {
        // Invalid event data — skip
      }
    });

    // --- Click capture ---
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target as Element;
        if (!target) return;
        send({
          category: "action",
          type: "click",
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
        send({
          category: "action",
          type: "input",
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
        send({
          category: "action",
          type: "submit",
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
        send({
          category: "action",
          type: "navigate",
          timestamp: new Date().toISOString(),
          from,
          to: lastUrl,
        });
      }
    }

    window.addEventListener("popstate", checkNavigation);
    window.addEventListener("hashchange", checkNavigation);

    // Observe pushState/replaceState from ISOLATED world
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
  },
});
