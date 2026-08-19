import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import type { LogsWebSocketMessage } from "@types";
import { REPLACERS } from "@common";
import { t } from "../../utils/t";
import { ConfirmationModal } from "./ConfirmationModal";
import { LeftMenu } from "./components/LeftMenu";
import { LogList } from "./components/LogList";
import { Controls } from "./components/Controls";
import type { LogEntry, GroupedLog } from "./types";
import "./index.css";

type Theme = "dark" | "light";

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<Theme>("dark");

  // Filtering & Sorting State
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortDate, setSortDate] = useState<"asc" | "desc">("desc");
  const [sortTag, setSortTag] = useState<"asc" | "desc" | null>(null);

  // UI State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
  }>({ isOpen: false, title: "", message: "", action: null });

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme: Theme = prev === "light" ? "dark" : "light";

      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);

      return newTheme;
    });
  }, []);

  useEffect(() => {
    const storedTheme: Theme =
      (localStorage.getItem("theme") as Theme) === "light" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", storedTheme);
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = import.meta.env.DEV ? "3000" : window.location.port;
      const wsUrl = `${protocol}//${host}${port ? `:${port}` : ""}/ws-logs`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(
            event.data,
          ) as LogsWebSocketMessage<"sentByServer">;

          switch (message.type) {
            case "sync_logs":
              setLogs(message.payload.logs);
              break;
            case "new_log":
              setLogs((prev) => {
                setAutoScrollEnabled((prev) => {
                  if (!prev) {
                    setHasNewLogs(true);
                  }
                  return prev;
                });
                return [message.payload, ...prev];
              });
              break;
            case "delete_log":
              setLogs((prev) =>
                prev.filter((l) => l.id !== message.payload.id),
              );
              break;
            case "delete_bulk":
              if (message.payload.ids) {
                const idSet = new Set(message.payload.ids);
                setLogs((prev) => prev.filter((l) => !idSet.has(l.id)));
              } else {
                setLogs([]); // delete all
              }
              break;
          }
        } catch (e) {
          REPLACERS.Logger.error("Failed to parse log message", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (autoScrollEnabled && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, autoScrollEnabled]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScrollEnabled(isAtBottom);

    if (isAtBottom && hasNewLogs) {
      setHasNewLogs(false);
    }
  }, [hasNewLogs]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      setAutoScrollEnabled(true);
      setHasNewLogs(false);
    }
  }, []);

  const executeModalAction = useCallback(() => {
    if (modalState.action) {
      modalState.action();
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, [modalState]);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const sendDelete = useCallback(
    (type: "request_delete_log", payload: { id: string }) => {
      wsRef.current?.send(JSON.stringify({ type, payload }));
    },
    [],
  );

  const sendDeleteGroup = useCallback((cleanedContent: string) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "request_delete_group",
        payload: { cleanedContent },
      }),
    );
  }, []);

  const sendDeleteAll = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "request_delete_all" }));
  }, []);

  const requestDeleteLog = useCallback(
    (id: string) => {
      setModalState({
        isOpen: true,
        title: "Delete Log",
        message: "Are you sure you want to delete this log entry?",
        action: () => sendDelete("request_delete_log", { id }),
      });
    },
    [sendDelete],
  );

  const requestDeleteGroup = useCallback(
    (cleanedContent: string, count: number) => {
      setModalState({
        isOpen: true,
        title: "Delete Log Group",
        message: `Delete all ${count} occurrences of this log?`,
        action: () => sendDeleteGroup(cleanedContent),
      });
    },
    [sendDeleteGroup],
  );

  const requestDeleteAllUI = useCallback(() => {
    setModalState({
      isOpen: true,
      title: "Clear All Logs",
      message:
        "Are you sure you want to permanently delete all server logs? This action cannot be undone.",
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
        theme={theme}
        toggleTheme={toggleTheme}
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

      <div className="logs-header-container">
        <div className="logs-header">
          <h2>
            {t("serverLogsViewer.title")}
            <span
              className={`logs-status-indicator logs-ml-half ${connected ? "connected" : "disconnected"}`}
              title={connected ? "Connected" : "Disconnected"}
            >
              {connected ? "● Connected" : "○ Disconnected"}
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
