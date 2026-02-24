import { RollingBuffer } from "@/lib/buffer";
import { MessageType } from "@/lib/messages";
import { IncidentStatus } from "@/lib/types";
import type { ExtensionMessage, BackgroundState } from "@/lib/messages";
import type { TimelineEvent, Incident } from "@/lib/types";

const timeline = new RollingBuffer<TimelineEvent>(100);

let recording = true;
let activeTabId: number | undefined;

function generateIncidentId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const rand = Math.random().toString(36).substring(2, 6);
  return `incident-${date}-${time}-${rand}`;
}

function truncateResponse(body: string | undefined, maxBytes: number = 1024): string | undefined {
  if (!body) return undefined;
  if (body.length <= maxBytes) return body;
  return body.substring(0, maxBytes) + "... [truncated]";
}

function countByCategory(category: string): number {
  return timeline.snapshot().filter((e) => e.category === category).length;
}

export default defineBackground({
  type: "module",
  main() {
    // --- Track active tab ---
    browser.tabs.onActivated.addListener((info) => {
      activeTabId = info.tabId;
    });
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) activeTabId = tabs[0].id;
    });

    // --- Network request capture (active tab only) ---
    browser.webRequest.onCompleted.addListener(
      (details) => {
        if (!recording) return;
        if (details.tabId !== activeTabId) return;
        if (details.statusCode >= 400) {
          timeline.push({
            category: "network",
            type: details.method,
            timestamp: new Date().toISOString(),
            url: details.url,
            status: details.statusCode,
            statusText: String(details.statusCode),
          });
        }
      },
      { urls: ["<all_urls>"] },
    );

    browser.webRequest.onErrorOccurred.addListener(
      (details) => {
        if (!recording) return;
        if (details.tabId !== activeTabId) return;
        timeline.push({
          category: "network",
          type: details.method,
          timestamp: new Date().toISOString(),
          url: details.url,
          status: 0,
          statusText: details.error,
        });
      },
      { urls: ["<all_urls>"] },
    );

    // --- Message hub ---
    browser.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        switch (message.type) {
          case MessageType.TIMELINE_EVENT: {
            if (!recording) break;
            const event = { ...message.payload };
            if (event.category === "network") {
              event.response = truncateResponse(event.response);
            }
            timeline.push(event);
            break;
          }
          case MessageType.GET_STATE: {
            const state: BackgroundState = {
              recording,
              timelineCount: timeline.size,
              actionCount: countByCategory("action"),
              errorCount: countByCategory("error"),
              networkCount: countByCategory("network"),
              consoleCount: countByCategory("console"),
              incidentCount: 0,
            };
            browser.storage.local.get("incidents").then((result) => {
              const incidents = (result.incidents ?? []) as Incident[];
              state.incidentCount = incidents.length;
              sendResponse(state);
            });
            return true;
          }
          case MessageType.SET_RECORDING: {
            recording = message.payload;
            break;
          }
          case MessageType.RESET_TIMELINE: {
            timeline.clear();
            recording = true;
            sendResponse(true);
            break;
          }
          case MessageType.CREATE_INCIDENT: {
            const incident: Incident = {
              id: generateIncidentId(),
              url: "",
              timestamp: new Date().toISOString(),
              timeline: timeline.snapshot(),
              notes: message.payload.notes,
              status: IncidentStatus.NEW,
            };

            browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
              if (tabs[0]?.url) {
                incident.url = tabs[0].url;
              }

              browser.storage.local.get("incidents").then((result) => {
                const incidents = (result.incidents ?? []) as Incident[];
                incidents.push(incident);
                browser.storage.local.set({ incidents }).then(() => {
                  timeline.clear();
                  sendResponse(incident);
                });
              });
            });
            return true;
          }
          case MessageType.EXPORT_INCIDENT: {
            browser.storage.local.get("incidents").then((result) => {
              const incidents = (result.incidents ?? []) as Incident[];
              const incident = incidents.find((i) => i.id === message.payload.incidentId);
              sendResponse(incident ?? null);
            });
            return true;
          }
          case MessageType.GET_INCIDENTS: {
            browser.storage.local.get("incidents").then((result) => {
              sendResponse((result.incidents ?? []) as Incident[]);
            });
            return true;
          }
          case MessageType.CLEAR_INCIDENTS: {
            browser.storage.local.set({ incidents: [] }).then(() => {
              sendResponse(true);
            });
            return true;
          }
        }
      },
    );
  },
});
