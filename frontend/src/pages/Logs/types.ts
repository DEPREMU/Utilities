import type { WSSyncLogsMessage, ServerLogType } from "@types";

export type LogEntry = WSSyncLogsMessage["payload"]["logs"][0];

export type GroupedLog = {
  id: string; // ID of the most recent log in group
  cleanedContent: string;
  tag: string;
  type: ServerLogType;
  occurrences: LogEntry[];
  latestTimestamp: string;
};
