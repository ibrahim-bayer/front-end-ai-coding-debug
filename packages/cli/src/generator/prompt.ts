import { ActionType, type Incident } from "../shared/types.js";

function formatAction(action: Incident["actions"][number], index: number): string {
  switch (action.type) {
    case ActionType.CLICK:
      return `${index + 1}. **Click** \`${action.target ?? "unknown"}\`${action.text ? ` — "${action.text}"` : ""}`;
    case ActionType.INPUT:
      return `${index + 1}. **Input** field \`${action.field ?? action.target ?? "unknown"}\``;
    case ActionType.NAVIGATE:
      return `${index + 1}. **Navigate** ${action.from ?? "?"} → ${action.to ?? "?"}`;
    case ActionType.SUBMIT:
      return `${index + 1}. **Submit** form \`${action.target ?? "unknown"}\``;
    case ActionType.SCROLL:
      return `${index + 1}. **Scroll** on \`${action.target ?? "page"}\``;
    default:
      return `${index + 1}. **${action.type}** \`${action.target ?? "unknown"}\``;
  }
}

function formatError(error: Incident["errors"][number]): string {
  let result = `**${error.type}**: ${error.message}`;
  if (error.stack) {
    result += `\n\`\`\`\n${error.stack}\n\`\`\``;
  }
  return result;
}

function formatNetwork(entry: Incident["network"][number]): string {
  let result = `- **${entry.method}** \`${entry.url}\` → **${entry.status}**`;
  if (entry.statusText && entry.statusText !== String(entry.status)) {
    result += ` ${entry.statusText}`;
  }
  if (entry.duration) {
    result += ` (${entry.duration}ms)`;
  }
  if (entry.response) {
    result += `\n  Response: \`${entry.response}\``;
  }
  return result;
}

function buildTaskSection(incident: Incident): string {
  const parts: string[] = [];

  if (incident.errors.length > 0) {
    const firstError = incident.errors[0];
    const stackLine = firstError.stack?.split("\n").find((l) => l.includes("/src/") || l.includes("/app/") || l.includes("/pages/") || l.includes("/components/"));
    if (stackLine) {
      parts.push(`Investigate the error starting at ${stackLine.trim()}.`);
    } else {
      parts.push(`Investigate the ${firstError.type}: ${firstError.message}.`);
    }
  }

  if (incident.network.length > 0) {
    const failedUrls = incident.network.map((n) => `${n.method} ${n.url} (${n.status})`);
    parts.push(`The following network requests failed:\n${failedUrls.map((u) => `- ${u}`).join("\n")}`);
  }

  if (incident.errors.length > 0 && incident.network.length > 0) {
    parts.push("The network failures may be the root cause of the runtime error. Check both the API handler and the component that consumes the response.");
  }

  if (parts.length === 0) {
    parts.push("Review the captured actions and logs to identify and fix the issue.");
  }

  parts.push("Ensure the fix handles edge cases gracefully (loading states, error states, missing data).");

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

  // Errors
  if (incident.errors.length > 0) {
    sections.push(`## Errors\n\n${incident.errors.map(formatError).join("\n\n")}\n`);
  }

  // User Actions
  if (incident.actions.length > 0) {
    sections.push(`## User Actions Leading to Error\n\n${incident.actions.map(formatAction).join("\n")}\n`);
  }

  // Network Failures
  if (incident.network.length > 0) {
    sections.push(`## Failed Network Requests\n\n${incident.network.map(formatNetwork).join("\n")}\n`);
  }

  // Console Logs
  if (incident.console_logs.length > 0) {
    sections.push(`## Console Logs\n\n\`\`\`\n${incident.console_logs.join("\n")}\n\`\`\`\n`);
  }

  // Developer Notes
  if (incident.notes) {
    sections.push(`## Developer Notes\n\n${incident.notes}\n`);
  }

  // Task
  sections.push(`## Task\n\n${buildTaskSection(incident)}`);

  return sections.join("\n");
}
