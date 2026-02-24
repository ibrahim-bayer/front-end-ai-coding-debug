import type {
  Incident,
  TimelineEvent,
  ActionEvent,
  ErrorEvent,
  NetworkEvent,
  ConsoleEvent,
} from "../shared/types.js";

function formatTimelineEvent(event: TimelineEvent, index: number): string {
  const time = new Date(event.timestamp).toLocaleTimeString();

  switch (event.category) {
    case "action":
      return formatAction(event, index, time);
    case "error":
      return formatError(event, index, time);
    case "network":
      return formatNetwork(event, index, time);
    case "console":
      return formatConsole(event, index, time);
  }
}

function formatAction(event: ActionEvent, index: number, time: string): string {
  switch (event.type) {
    case "click":
      return `${index + 1}. \`${time}\` **Click** \`${event.target ?? "unknown"}\`${event.text ? ` — "${event.text}"` : ""}`;
    case "input":
      return `${index + 1}. \`${time}\` **Input** field \`${event.field ?? event.target ?? "unknown"}\``;
    case "navigate":
      return `${index + 1}. \`${time}\` **Navigate** ${event.from ?? "?"} → ${event.to ?? "?"}`;
    case "submit":
      return `${index + 1}. \`${time}\` **Submit** form \`${event.target ?? "unknown"}\``;
    case "scroll":
      return `${index + 1}. \`${time}\` **Scroll** on \`${event.target ?? "page"}\``;
  }
}

function formatError(event: ErrorEvent, index: number, time: string): string {
  let result = `${index + 1}. \`${time}\` **ERROR** [${event.type}] ${event.message}`;
  if (event.stack) {
    result += `\n   \`\`\`\n   ${event.stack.split("\n").join("\n   ")}\n   \`\`\``;
  }
  return result;
}

function formatNetwork(event: NetworkEvent, index: number, time: string): string {
  let result = `${index + 1}. \`${time}\` **${event.type}** \`${event.url}\` → **${event.status}**`;
  if (event.statusText && event.statusText !== String(event.status)) {
    result += ` ${event.statusText}`;
  }
  if (event.duration) {
    result += ` (${event.duration}ms)`;
  }
  if (event.response) {
    result += `\n   Response: \`${event.response}\``;
  }
  return result;
}

function formatConsole(event: ConsoleEvent, index: number, time: string): string {
  const level = event.type.toUpperCase();
  return `${index + 1}. \`${time}\` **CONSOLE.${level}** ${event.message}`;
}

function buildTaskSection(incident: Incident): string {
  const errors = incident.timeline.filter((e): e is ErrorEvent => e.category === "error");
  const network = incident.timeline.filter((e): e is NetworkEvent => e.category === "network");
  const parts: string[] = [];

  if (errors.length > 0) {
    const firstError = errors[0];
    const stackLine = firstError.stack
      ?.split("\n")
      .find(
        (l) =>
          l.includes("/src/") ||
          l.includes("/app/") ||
          l.includes("/pages/") ||
          l.includes("/components/"),
      );
    if (stackLine) {
      parts.push(`Investigate the error starting at ${stackLine.trim()}.`);
    } else {
      parts.push(`Investigate the ${firstError.type}: ${firstError.message}.`);
    }
  }

  if (network.length > 0) {
    const failedUrls = network.map((n) => `${n.type} ${n.url} (${n.status})`);
    parts.push(
      `The following network requests failed:\n${failedUrls.map((u) => `- ${u}`).join("\n")}`,
    );
  }

  if (errors.length > 0 && network.length > 0) {
    parts.push(
      "The network failures may be the root cause of the runtime error. Check both the API handler and the component that consumes the response.",
    );
  }

  if (parts.length === 0) {
    parts.push("Review the captured timeline events to identify and fix the issue.");
  }

  parts.push(
    "Ensure the fix handles edge cases gracefully (loading states, error states, missing data).",
  );

  return parts.join("\n\n");
}

export function generatePrompt(incident: Incident): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Fix: ${incident.id}\n`);

  // Route
  sections.push(`## Route\n\n${incident.url}\n`);

  // Timestamp
  sections.push(`## Timestamp\n\n${new Date(incident.timestamp).toLocaleString()}\n`);

  // Timeline (chronological)
  if (incident.timeline.length > 0) {
    const formatted = incident.timeline.map(formatTimelineEvent).join("\n");
    sections.push(`## Timeline\n\n${formatted}\n`);
  }

  // Summary counts
  const errors = incident.timeline.filter((e) => e.category === "error").length;
  const network = incident.timeline.filter((e) => e.category === "network").length;
  const actions = incident.timeline.filter((e) => e.category === "action").length;
  const console_ = incident.timeline.filter((e) => e.category === "console").length;
  sections.push(
    `## Summary\n\n${incident.timeline.length} events: ${errors} errors, ${network} network failures, ${actions} user actions, ${console_} console messages\n`,
  );

  // Developer Notes
  if (incident.notes) {
    sections.push(`## Developer Notes\n\n${incident.notes}\n`);
  }

  // Task
  sections.push(`## Task\n\n${buildTaskSection(incident)}`);

  return sections.join("\n");
}
