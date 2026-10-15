import { logger } from "@/utils";
import type { LogEntry } from "../types";
import type { LogsWebSocketMessage } from "@types";
import { calculateExponentialBackoff, REPLACERS } from "@common";
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Manages the real-time diagnostic log streaming connection.
 * Automatically closes transport and cancels reconnection timers upon unmount.
 *
 * @returns State and helper callbacks for logs view.
 */
export function useLogsWebSocket() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [hasNewLogs, setHasNewLogs] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
  const isDisposedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    isDisposedRef.current = false;

    const clearRetryTimer = () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const connect = () => {
      if (isDisposedRef.current) return;
      clearRetryTimer();

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = REPLACERS.isDev ? "3000" : window.location.port;
      const wsUrl = `${protocol}//${host}${port ? `:${port}` : ""}/ws-logs`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDisposedRef.current) {
          ws.close();
          return;
        }
        retryCountRef.current = 0;
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
                setLogs([]);
              }
              break;
          }
        } catch (e) {
          logger.error("Failed to parse log message", e);
        }
      };

      ws.onclose = () => {
        if (isDisposedRef.current) return;

        setConnected(false);

        const delay = calculateExponentialBackoff(retryCountRef.current, {
          initialDelay: 1000,
          maxDelay: 30000,
          multiplier: 1.5,
          jitter: 0.1,
        });
        retryCountRef.current += 1;

        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      isDisposedRef.current = true;
      clearRetryTimer();

      if (wsRef.current) {
        const activeWs = wsRef.current;
        wsRef.current = null;
        activeWs.onopen = null;
        activeWs.onclose = null;
        activeWs.onerror = null;
        activeWs.onmessage = null;
        activeWs.close();
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
