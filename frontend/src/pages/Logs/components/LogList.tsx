import React from "react";
import { t } from "../../../utils/t";
import type { GroupedLog } from "../types";
import { LogEntryRow } from "./LogEntryRow";

interface LogListProps {
  displayGroups: GroupedLog[];
  isLoading: boolean;
  search: string;
  expandedGroups: Set<string>;
  hasNewLogs: boolean;
  onToggleGroup: (content: string) => void;
  onRequestDeleteGroup: (content: string, count: number) => void;
  onRequestDeleteLog: (id: string) => void;
  onScrollToBottom: () => void;
  listRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
}

export const LogList: React.FC<LogListProps> = React.memo(({
  displayGroups,
  isLoading,
  search,
  expandedGroups,
  hasNewLogs,
  onToggleGroup,
  onRequestDeleteGroup,
  onRequestDeleteLog,
  onScrollToBottom,
  listRef,
  handleScroll
}) => {
  return (
    <div className="logs-main-area">
      <div className="logs-main-content">
        <div className="logs-list" ref={listRef} onScroll={handleScroll}>
          {displayGroups.map((group) => (
            <LogEntryRow
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.cleanedContent)}
              onToggle={onToggleGroup}
              onRequestDeleteGroup={onRequestDeleteGroup}
              onRequestDeleteLog={onRequestDeleteLog}
            />
          ))}
          {displayGroups.length === 0 && !isLoading && (
            <div className="logs-empty-message">
              {search ? t("serverLogsViewer.noLogsFound") : t("serverLogsViewer.noLogsFound")}
            </div>
          )}
          {isLoading && (
            <div className="logs-empty-message">
              {t("serverLogsViewer.loading")}
            </div>
          )}

          {hasNewLogs && (
            <button className="logs-new-indicator" onClick={onScrollToBottom}>
              {t("serverLogsViewer.newLogs")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
