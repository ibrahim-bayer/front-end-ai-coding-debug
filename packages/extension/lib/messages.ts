import type { Action, ErrorEntry, NetworkEntry } from "./types";

export enum MessageType {
  ACTION = "chrome2code:action",
  ERROR = "chrome2code:error",
  NETWORK = "chrome2code:network",
  CONSOLE_LOG = "chrome2code:console_log",
  GET_STATE = "chrome2code:get_state",
  SET_RECORDING = "chrome2code:set_recording",
  CREATE_INCIDENT = "chrome2code:create_incident",
  EXPORT_INCIDENT = "chrome2code:export_incident",
  GET_INCIDENTS = "chrome2code:get_incidents",
  CLEAR_INCIDENTS = "chrome2code:clear_incidents",
}

export interface ActionMessage {
  type: MessageType.ACTION;
  payload: Action;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  payload: ErrorEntry;
}

export interface NetworkMessage {
  type: MessageType.NETWORK;
  payload: NetworkEntry;
}

export interface ConsoleLogMessage {
  type: MessageType.CONSOLE_LOG;
  payload: string;
}

export interface GetStateMessage {
  type: MessageType.GET_STATE;
}

export interface SetRecordingMessage {
  type: MessageType.SET_RECORDING;
  payload: boolean;
}

export interface CreateIncidentMessage {
  type: MessageType.CREATE_INCIDENT;
  payload: {
    notes?: string;
  };
}

export interface ExportIncidentMessage {
  type: MessageType.EXPORT_INCIDENT;
  payload: {
    incidentId: string;
  };
}

export interface GetIncidentsMessage {
  type: MessageType.GET_INCIDENTS;
}

export interface ClearIncidentsMessage {
  type: MessageType.CLEAR_INCIDENTS;
}

export type ExtensionMessage =
  | ActionMessage
  | ErrorMessage
  | NetworkMessage
  | ConsoleLogMessage
  | GetStateMessage
  | SetRecordingMessage
  | CreateIncidentMessage
  | ExportIncidentMessage
  | GetIncidentsMessage
  | ClearIncidentsMessage;

export interface BackgroundState {
  recording: boolean;
  actionCount: number;
  errorCount: number;
  networkCount: number;
  logCount: number;
  incidentCount: number;
}
