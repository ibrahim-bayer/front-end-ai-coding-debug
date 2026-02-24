import type { TimelineEvent } from "./types";

export enum MessageType {
  TIMELINE_EVENT = "chrome2code:timeline_event",
  GET_STATE = "chrome2code:get_state",
  SET_RECORDING = "chrome2code:set_recording",
  CREATE_INCIDENT = "chrome2code:create_incident",
  EXPORT_INCIDENT = "chrome2code:export_incident",
  GET_INCIDENTS = "chrome2code:get_incidents",
  CLEAR_INCIDENTS = "chrome2code:clear_incidents",
}

export interface TimelineEventMessage {
  type: MessageType.TIMELINE_EVENT;
  payload: TimelineEvent;
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
  | TimelineEventMessage
  | GetStateMessage
  | SetRecordingMessage
  | CreateIncidentMessage
  | ExportIncidentMessage
  | GetIncidentsMessage
  | ClearIncidentsMessage;

export interface BackgroundState {
  recording: boolean;
  timelineCount: number;
  incidentCount: number;
}

// Prefix for MAIN world → ISOLATED world postMessage communication
export const MAIN_WORLD_MESSAGE_SOURCE = "chrome2code-main";
