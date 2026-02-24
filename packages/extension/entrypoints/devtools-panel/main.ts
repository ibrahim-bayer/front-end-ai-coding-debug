import { MessageType } from "@/lib/messages";
import type { Incident } from "@/lib/types";

function $(selector: string): HTMLElement {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element ${selector} not found`);
  return el as HTMLElement;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage<T>(message: { type: MessageType; payload?: unknown }): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

// --- Tab switching ---
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    const tabName = (tab as HTMLElement).dataset.tab;
    $(`#tab-${tabName}`).classList.add("active");
  });
});

// --- Render incidents ---
function renderIncidents(incidents: Incident[]): void {
  const list = $("#incident-list");
  if (incidents.length === 0) {
    list.innerHTML = '<div class="empty">No incidents yet. Click "Snapshot Incident" to capture one.</div>';
    return;
  }

  list.innerHTML = incidents
    .reverse()
    .map((inc) => {
      const errors = inc.timeline.filter((e) => e.category === "error").length;
      const network = inc.timeline.filter((e) => e.category === "network").length;
      const actions = inc.timeline.filter((e) => e.category === "action").length;
      const console_ = inc.timeline.filter((e) => e.category === "console").length;

      return `
        <div class="log-entry incident-entry">
          <div class="entry-header">
            <strong>${escapeHtml(inc.id)}</strong>
            <span class="entry-time">${new Date(inc.timestamp).toLocaleString()}</span>
          </div>
          <div class="entry-meta">${escapeHtml(inc.url)}</div>
          <div class="entry-stats">
            ${inc.timeline.length} events · ${errors} errors · ${network} network · ${actions} actions · ${console_} console
          </div>
          ${inc.notes ? `<div class="entry-notes">${escapeHtml(inc.notes)}</div>` : ""}
          <button class="btn btn-sm btn-export" data-id="${escapeHtml(inc.id)}">Export JSON</button>
        </div>
      `;
    })
    .join("");
}

async function refreshAll(): Promise<void> {
  const state = await sendMessage<{
    recording: boolean;
    timelineCount: number;
  }>({ type: MessageType.GET_STATE });

  // Update timeline tab badge
  const timelineTab = document.querySelector('[data-tab="timeline"]');
  if (timelineTab) {
    timelineTab.textContent = `Timeline (${state.timelineCount})`;
  }

  // Load incidents
  const incidents = await sendMessage<Incident[]>({ type: MessageType.GET_INCIDENTS });
  renderIncidents(incidents);

  const incidentTab = document.querySelector('[data-tab="incidents"]');
  if (incidentTab) {
    incidentTab.textContent = `Incidents (${incidents.length})`;
  }
}

// --- Event listeners ---
$("#refresh-btn").addEventListener("click", refreshAll);

$("#create-btn").addEventListener("click", async () => {
  const notes = prompt("Optional notes about this incident:");
  await sendMessage({
    type: MessageType.CREATE_INCIDENT,
    payload: { notes: notes || undefined },
  });
  await refreshAll();
});

$("#incident-list").addEventListener("click", async (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("btn-export")) return;

  const id = target.dataset.id;
  if (!id) return;

  const incident = await sendMessage<Incident | null>({
    type: MessageType.EXPORT_INCIDENT,
    payload: { incidentId: id },
  });

  if (incident) {
    const blob = new Blob([JSON.stringify(incident, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${incident.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

// --- Init ---
refreshAll();
setInterval(refreshAll, 3000);
