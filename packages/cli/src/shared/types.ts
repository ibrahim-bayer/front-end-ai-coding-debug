export enum IncidentStatus {
  NEW = "new",
  PROMPTED = "prompted",
  RESOLVED = "resolved",
}

export interface ActionEvent {
  category: "action";
  type: "click" | "input" | "navigate" | "scroll" | "submit";
  timestamp: string;
  target?: string;
  text?: string;
  from?: string;
  to?: string;
  field?: string;
}

export interface ErrorEvent {
  category: "error";
  type: string;
  timestamp: string;
  message: string;
  stack?: string;
}

export interface NetworkEvent {
  category: "network";
  type: string;
  timestamp: string;
  url: string;
  status: number;
  statusText?: string;
  requestBody?: string;
  requestHeaders?: Record<string, string>;
  response?: string;
  responseHeaders?: Record<string, string>;
  duration?: number;
}

export interface ConsoleEvent {
  category: "console";
  type: "log" | "warn" | "error";
  timestamp: string;
  message: string;
}

export type TimelineEvent = ActionEvent | ErrorEvent | NetworkEvent | ConsoleEvent;

export interface Incident {
  id: string;
  url: string;
  timestamp: string;
  timeline: TimelineEvent[];
  notes?: string;
  status?: IncidentStatus;
}
