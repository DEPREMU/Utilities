import "./index.css";
import { t } from "@utils";
import { LogList } from "./components/LogList";
import { LeftMenu } from "./components/LeftMenu";
import { LogsHeader } from "./components/LogsHeader";
import type { GroupedLog } from "./types";
import { useLogsWebSocket } from "./hooks/useLogsWebSocket";
import { ConfirmationModal } from "./ConfirmationModal";
import React, { useState, useMemo, useCallback } from "react";

const Logs: React.FC = () => {
  const {
    logs,
    connected,
    hasNewLogs,
    listRef,
    handleScroll,
    scrollToBottom,
    sendDelete,
    sendDeleteGroup,
    sendDeleteAll,
  } = useLogsWebSocket();

  // Filtering & Sorting State
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortDate, setSortDate] = useState<"asc" | "desc">("desc");
  const [sortTag, setSortTag] = useState<"asc" | "desc" | null>(null);

  // UI State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
  }>({ isOpen: false, title: "", message: "", action: null });

  const executeModalAction = useCallback(() => {
    if (modalState.action) {
      modalState.action();
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const requestDeleteLog = useCallback(
    (id: string) => {
      setModalState({
        isOpen: true,
        title: t("serverLogsViewer.deleteLogTitle"),
        message: t("serverLogsViewer.deleteLogMessage"),
        action: () => sendDelete("request_delete_log", { id }),
      });
    },
    [sendDelete],
  );

  const requestDeleteGroup = useCallback(
    (cleanedContent: string, count: number) => {
      setModalState({
        isOpen: true,
        title: t("serverLogsViewer.deleteLogGroupTitle"),
        message: t("serverLogsViewer.deleteLogGroupMessage", {
          count: String(count),
        }),
        action: () => sendDeleteGroup(cleanedContent),
      });
    },
    [sendDeleteGroup],
  );

  const requestDeleteAllUI = useCallback(() => {
    setModalState({
      isOpen: true,
      title: t("serverLogsViewer.clearAllLogsTitle"),
      message: t("serverLogsViewer.clearAllLogsMessage"),
      action: () => sendDeleteAll(),
    });
  }, [sendDeleteAll]);

  const toggleGroup = useCallback((content: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(content)) next.delete(content);
      else next.add(content);
      return next;
    });
  }, []);

  // Compute available tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    logs.forEach((log) => tags.add(log.tag));
    return Array.from(tags).sort();
  }, [logs]);

  // Compute and sort groups
  const displayGroups = useMemo(() => {
    const groupMap = new Map<string, GroupedLog>();

    logs.forEach((log) => {
      if (
        search &&
        !log.cleanedContent.toLowerCase().includes(search.toLowerCase()) &&
        !log.tag.toLowerCase().includes(search.toLowerCase())
      ) {
        return;
      }
      if (selectedTags.length > 0 && !selectedTags.includes(log.tag)) {
        return;
      }

      const existing = groupMap.get(log.cleanedContent);
      if (existing) {
        existing.occurrences.push(log);
        if (new Date(log.timestamp) > new Date(existing.latestTimestamp)) {
          existing.latestTimestamp = log.timestamp;
          existing.id = log.id;
        }
      } else {
        groupMap.set(log.cleanedContent, {
          id: log.id,
          cleanedContent: log.cleanedContent,
          tag: log.tag,
          type: log.type,
          occurrences: [log],
          latestTimestamp: log.timestamp,
        });
      }
    });

    const groupedArr = Array.from(groupMap.values());

    groupedArr.sort((a, b) => {
      if (sortTag) {
        const tagCmp = a.tag.localeCompare(b.tag);
        if (tagCmp !== 0) return sortTag === "asc" ? tagCmp : -tagCmp;
      }

      const timeA = new Date(a.latestTimestamp).getTime();
      const timeB = new Date(b.latestTimestamp).getTime();
      return sortDate === "asc" ? timeA - timeB : timeB - timeA;
    });

    return groupedArr;
  }, [logs, search, selectedTags, sortDate, sortTag]);

  const isLoading = logs.length === 0 && !connected;

  return (
    <div className="logs-container">
      <LeftMenu
        search={search}
        setSearch={setSearch}
        availableTags={availableTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
      />

      <LogList
        displayGroups={displayGroups}
        isLoading={isLoading}
        search={search}
        expandedGroups={expandedGroups}
        hasNewLogs={hasNewLogs}
        onToggleGroup={toggleGroup}
        onRequestDeleteGroup={requestDeleteGroup}
        onRequestDeleteLog={requestDeleteLog}
        onScrollToBottom={scrollToBottom}
        listRef={listRef}
        handleScroll={handleScroll}
      />

      <LogsHeader
        connected={connected}
        sortDate={sortDate}
        setSortDate={setSortDate}
        sortTag={sortTag}
        setSortTag={setSortTag}
        requestDeleteAllUI={requestDeleteAllUI}
      />

      <ConfirmationModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        onConfirm={executeModalAction}
        onCancel={closeModal}
      />
    </div>
  );
};

export default Logs;
