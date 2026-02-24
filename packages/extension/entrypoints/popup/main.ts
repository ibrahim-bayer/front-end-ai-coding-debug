import { MessageType } from "@/lib/messages";
import type { BackgroundState } from "@/lib/messages";
import type { Incident } from "@/lib/types";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

async function sendMessage<T>(message: { type: MessageType; payload?: unknown }): Promise<T> {
  return browser.runtime.sendMessage(message) as Promise<T>;
}

async function refreshState(): Promise<void> {
  const state = await sendMessage<BackgroundState>({ type: MessageType.GET_STATE });

  $("action-count").textContent = String(state.actionCount);
  $("error-count").textContent = String(state.errorCount);
  $("network-count").textContent = String(state.networkCount);
  $("log-count").textContent = String(state.logCount);
  $("incident-count").textContent = String(state.incidentCount);

  const statusEl = $("status");
  const toggleBtn = $("toggle-btn");

  if (state.recording) {
    statusEl.textContent = "Recording";
    statusEl.className = "status recording";
    toggleBtn.textContent = "Pause";
  } else {
    statusEl.textContent = "Paused";
    statusEl.className = "status paused";
    toggleBtn.textContent = "Resume";
  }
}

async function loadIncidents(): Promise<void> {
  const incidents = await sendMessage<Incident[]>({ type: MessageType.GET_INCIDENTS });
  const list = $("incident-list");
  list.innerHTML = "";

  if (incidents.length === 0) {
    list.innerHTML = '<li class="empty">No incidents captured yet</li>';
    return;
  }

  for (const incident of incidents.reverse()) {
    const li = document.createElement("li");
    li.className = "incident-item";
    li.innerHTML = `
      <div class="incident-header">
        <strong>${incident.id}</strong>
        <span class="incident-time">${new Date(incident.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="incident-meta">
        ${incident.errors.length} errors · ${incident.network.length} network · ${incident.actions.length} actions
      </div>
      <div class="incident-url">${incident.url}</div>
      <div class="incident-actions">
        <button class="btn btn-sm btn-export" data-id="${incident.id}">Export JSON</button>
        <button class="btn btn-sm btn-copy" data-id="${incident.id}">Copy</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function downloadJson(data: Incident, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyIncidentToClipboard(incidentId: string): Promise<void> {
  const incident = await sendMessage<Incident | null>({
    type: MessageType.EXPORT_INCIDENT,
    payload: { incidentId },
  });
  if (incident) {
    await navigator.clipboard.writeText(JSON.stringify(incident, null, 2));
  }
}

// --- Event Listeners ---

let isRecording = true;

$("toggle-btn").addEventListener("click", async () => {
  isRecording = !isRecording;
  await sendMessage({ type: MessageType.SET_RECORDING, payload: isRecording });
  await refreshState();
});

$("incident-btn").addEventListener("click", () => {
  $("notes-section").classList.remove("hidden");
});

$("cancel-incident").addEventListener("click", () => {
  $("notes-section").classList.add("hidden");
  ($("notes") as HTMLTextAreaElement).value = "";
});

$("confirm-incident").addEventListener("click", async () => {
  const notes = ($("notes") as HTMLTextAreaElement).value.trim() || undefined;
  await sendMessage({
    type: MessageType.CREATE_INCIDENT,
    payload: { notes },
  });
  $("notes-section").classList.add("hidden");
  ($("notes") as HTMLTextAreaElement).value = "";
  await refreshState();
  await loadIncidents();
});

$("clear-btn").addEventListener("click", async () => {
  await sendMessage({ type: MessageType.CLEAR_INCIDENTS });
  await refreshState();
  await loadIncidents();
});

$("incident-list").addEventListener("click", async (e) => {
  const target = e.target as HTMLElement;
  const id = target.dataset.id;
  if (!id) return;

  if (target.classList.contains("btn-export")) {
    const incident = await sendMessage<Incident | null>({
      type: MessageType.EXPORT_INCIDENT,
      payload: { incidentId: id },
    });
    if (incident) {
      downloadJson(incident, `${incident.id}.json`);
    }
  }

  if (target.classList.contains("btn-copy")) {
    await copyIncidentToClipboard(id);
    target.textContent = "Copied!";
    setTimeout(() => {
      target.textContent = "Copy";
    }, 1500);
  }
});

// --- Init ---
refreshState();
loadIncidents();

// Refresh every 2 seconds while popup is open
setInterval(() => {
  refreshState();
}, 2000);
