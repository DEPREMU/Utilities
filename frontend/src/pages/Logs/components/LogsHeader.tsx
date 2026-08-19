import React from "react";
import { t } from "@utils";
import { Controls } from "./Controls";

interface LogsHeaderProps {
  connected: boolean;
  sortDate: "asc" | "desc";
  setSortDate: (val: "asc" | "desc") => void;
  sortTag: "asc" | "desc" | null;
  setSortTag: (val: "asc" | "desc" | null) => void;
  requestDeleteAllUI: () => void;
}

export const LogsHeader: React.FC<LogsHeaderProps> = ({
  connected,
  sortDate,
  setSortDate,
  sortTag,
  setSortTag,
  requestDeleteAllUI,
}) => {
  return (
    <div className="logs-header-container">
      <div className="logs-header">
        <h2>
          {t("serverLogsViewer.title")}
          <span
            className={`logs-status-indicator logs-ml-half ${connected ? "connected" : "disconnected"}`}
            title={
              connected
                ? t("serverLogsViewer.connected")
                : t("serverLogsViewer.disconnected")
            }
          >
            {connected
              ? t("serverLogsViewer.connected")
              : t("serverLogsViewer.disconnected")}
          </span>
        </h2>
        <Controls
          sortDate={sortDate}
          setSortDate={setSortDate}
          sortTag={sortTag}
          setSortTag={setSortTag}
          requestDeleteAllUI={requestDeleteAllUI}
        />
      </div>
    </div>
  );
};
