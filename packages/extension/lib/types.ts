export enum ActionType {
  CLICK = "click",
  INPUT = "input",
  NAVIGATE = "navigate",
  SCROLL = "scroll",
  SUBMIT = "submit",
}

export enum IncidentStatus {
  NEW = "new",
  PROMPTED = "prompted",
  RESOLVED = "resolved",
}

export interface Action {
  type: ActionType;
  timestamp: string;
  target?: string;
  text?: string;
  from?: string;
  to?: string;
  field?: string;
}

export interface ErrorEntry {
  message: string;
  stack?: string;
  type: string;
  timestamp: string;
}

export interface NetworkEntry {
  method: string;
  url: string;
  status: number;
  statusText?: string;
  response?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timestamp: string;
  duration?: number;
}

export interface Incident {
  id: string;
  url: string;
  timestamp: string;
  actions: Action[];
  errors: ErrorEntry[];
  network: NetworkEntry[];
  console_logs: string[];
  notes?: string;
  status?: IncidentStatus;
}
