import React from "react";
import { t } from "@utils";

interface ControlsProps {
  sortDate: "asc" | "desc";
  setSortDate: (val: "asc" | "desc") => void;
  sortTag: "asc" | "desc" | null;
  setSortTag: (val: "asc" | "desc" | null) => void;
  requestDeleteAllUI: () => void;
}

export const Controls: React.FC<ControlsProps> = React.memo(({
  sortDate,
  setSortDate,
  sortTag,
  setSortTag,
  requestDeleteAllUI
}) => {
  return (
    <div className="logs-controls">
      <button className="logs-btn" onClick={() => setSortDate(sortDate === "asc" ? "desc" : "asc")}>
        {sortDate === "asc" ? t("serverLogsViewer.sortChronological") : t("serverLogsViewer.sortReverseChronological")}
      </button>
      <button className="logs-btn" onClick={() => setSortTag(sortTag === "asc" ? "desc" : sortTag === "desc" ? null : "asc")}>
        {sortTag === "asc" ? t("serverLogsViewer.sortTagAz") : sortTag === "desc" ? t("serverLogsViewer.sortTagZa") : t("serverLogsViewer.tag") + " OFF"}
      </button>
      <button className="logs-btn danger" onClick={requestDeleteAllUI}>
        {t("serverLogsViewer.clearAll")}
      </button>
    </div>
  );
});
