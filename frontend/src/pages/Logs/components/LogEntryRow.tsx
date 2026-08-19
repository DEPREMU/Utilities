import React, { useState } from "react";
import { t } from "../../../utils/t";
import type { GroupedLog } from "../types";

interface LogEntryRowProps {
  group: GroupedLog;
  isExpanded: boolean;
  onToggle: (content: string) => void;
  onRequestDeleteGroup: (content: string, count: number) => void;
  onRequestDeleteLog: (id: string) => void;
}

export const LogEntryRow: React.FC<LogEntryRowProps> = React.memo(({
  group,
  isExpanded,
  onToggle,
  onRequestDeleteGroup,
  onRequestDeleteLog
}) => {
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const isLongMessage = group.cleanedContent.length > 150;

  return (
    <div className="log-entry">
      <div className="log-entry-header" onClick={() => onToggle(group.cleanedContent)}>
        <div className="log-entry-content-wrapper">
          <span className={`log-type ${group.type}`}>{group.type.toUpperCase()}</span>
          <span className="log-tag">{t("common.openBracket")}{group.tag}{t("common.closeBracket")}</span>
          <div className="log-content-container">
            <span className="log-content">
              {isLongMessage && !isTextExpanded 
                ? group.cleanedContent.substring(0, 150) + "..." 
                : group.cleanedContent}
            </span>
            {isLongMessage && (
              <button 
                className="logs-btn logs-btn-show-more" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTextExpanded(!isTextExpanded);
                }}
              >
                {isTextExpanded ? t("serverLogsViewer.showLess") : t("serverLogsViewer.showMore")}
              </button>
            )}
          </div>
        </div>
        
        <div className="log-actions">
          {group.occurrences.length > 1 && (
            <span className="log-count">
              {group.occurrences.length} 
              {t("serverLogsViewer.occurrences")}
            </span>
          )}
          <span className="log-timestamp">{new Date(group.latestTimestamp).toLocaleTimeString()}</span>
          <button className="logs-btn danger" onClick={(e) => { e.stopPropagation(); onRequestDeleteGroup(group.cleanedContent, group.occurrences.length); }}>
            {t("serverLogsViewer.del")}
          </button>
          <span className="logs-chevron">
            {group.occurrences.length > 1 ? (isExpanded ? "▲" : "▼") : ""}
          </span>
        </div>
      </div>

      <div className={`log-children ${!isExpanded ? "collapsed" : ""}`}>
        {group.occurrences.length > 1 && group.occurrences.map((occ) => (
          <div key={occ.id} className="log-child">
            <span className="log-timestamp">{new Date(occ.timestamp).toLocaleString()}</span>
            <button className="logs-btn danger" onClick={() => onRequestDeleteLog(occ.id)}>
              {t("serverLogsViewer.del")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
