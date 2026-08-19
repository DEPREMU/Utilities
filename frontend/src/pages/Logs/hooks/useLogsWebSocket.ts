import { useState, useEffect, useRef, useCallback } from "react";
import type { LogsWebSocketMessage } from "@types";
import { REPLACERS } from "@common";
import type { LogEntry } from "../types";

export function useLogsWebSocket() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [hasNewLogs, setHasNewLogs] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
                setAutoScrollEnabled((prevScroll) => {
                  if (!prevScroll) {
                    setHasNewLogs(true);
                  }
                  return prevScroll;
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

  return {
    logs,
    connected,
    autoScrollEnabled,
    hasNewLogs,
    listRef,
    handleScroll,
    scrollToBottom,
    sendDelete,
    sendDeleteGroup,
    sendDeleteAll,
  };
}
