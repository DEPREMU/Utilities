export type ServerLogType = "log" | "warn" | "error";

export type WSSyncLogsMessage = {
  type: "sync_logs";
  payload: {
    logs: Array<{
      id: string;
      type: ServerLogType;
      cleanedContent: string;
      tag: string;
      timestamp: string;
    }>;
  };
};

export type WSNewLogMessage = {
  type: "new_log";
  payload: {
    id: string;
    type: ServerLogType;
    cleanedContent: string;
    tag: string;
    timestamp: string;
  };
};

export type WSDeleteLogMessage = {
  type: "delete_log";
  payload: {
    id: string;
  };
};

export type WSDeleteBulkMessage = {
  type: "delete_bulk";
  payload: {
    ids?: string[];
  };
};

export type WSRequestDeleteLog = {
  type: "request_delete_log";
  payload: {
    id: string;
  };
};

export type WSRequestDeleteGroup = {
  type: "request_delete_group";
  payload: {
    cleanedContent: string;
  };
};

export type WSRequestDeleteAll = {
  type: "request_delete_all";
};

export type LogsWebSocketMessage<SentBy extends "sentByServer" | "sentByClient"> =
  SentBy extends "sentByServer"
    ? WSSyncLogsMessage | WSNewLogMessage | WSDeleteLogMessage | WSDeleteBulkMessage
    : WSRequestDeleteLog | WSRequestDeleteGroup | WSRequestDeleteAll;
