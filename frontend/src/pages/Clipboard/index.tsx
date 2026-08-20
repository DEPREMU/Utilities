import "./index.css";
import { t } from "@utils";
import { REPLACERS, Timers } from "@common";
import type { ContextBridgeType } from "@types";
import React, { useEffect, useState } from "react";

export interface ClipboardItem {
  id: string;
  content: string;
}

const windowTyped = (
  window as unknown as { UtilitiesForPC: ContextBridgeType["UtilitiesForPC"] }
).UtilitiesForPC;

const Clipboard: React.FC = () => {
  const [retry, setRetry] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!windowTyped) {
      window.location.href = "/";
      return;
    }

    let cleanup: (() => void) | undefined;

    const fetchHistory = async () => {
      try {
        if (windowTyped.getClipboardHistory) {
          const history = await windowTyped.getClipboardHistory();
          if (!history || history.length === 0) {
            const id = Timers.setTimeout(() => {
              setRetry((n) => n + 1);
            }, retry * 100);
            return () => Timers.clearTimeout(id);
          }
          setItems(history);
        }

        if (windowTyped.onClipboardItemsUpdated) {
          cleanup = windowTyped.onClipboardItemsUpdated(
            (newItems: ClipboardItem[]) => {
              setItems(newItems);
            },
          ) as unknown as (() => void) | undefined;
        }
      } catch (err) {
        REPLACERS.Logger.error("Error fetching clipboard history", err);
        setError(t("clipboard.errorLoading"));
      }
    };

    fetchHistory();

    return () => {
      if (cleanup && typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [retry]);

  const handleCopy = async (item: ClipboardItem) => {
    if (!windowTyped?.setClipboard) return;

    try {
      windowTyped.setClipboard(item.content);
      showSnackbar(t("clipboard.copiedToClipboard"));
      setTimeout(() => {
        if (windowTyped?.hideClipboardWindow) {
          windowTyped.hideClipboardWindow();
        }
      }, 1000);
    } catch (err) {
      REPLACERS.Logger.error("Error setting clipboard", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!windowTyped?.deleteClipboardItem) return;
    try {
      const success = await windowTyped.deleteClipboardItem(id);
      if (success) setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      REPLACERS.Logger.error("Error deleting clipboard item", err);
    }
  };

  const handleClearAll = async () => {
    if (!windowTyped?.deleteAllClipboardItems) return;
    try {
      await windowTyped.deleteAllClipboardItems();
      setItems([]);
    } catch (err) {
      REPLACERS.Logger.error("Error clearing clipboard history", err);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setTimeout(() => {
      setSnackbarMessage(null);
    }, 2000);
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.content.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="clipboard-container">
      <div className="clipboard-header">
        <h2>{t("clipboard.title")}</h2>
        <div className="clipboard-actions">
          <button className="clipboard-btn" onClick={handleClearAll}>
            {t("labels.deleteAll")}
          </button>
        </div>
      </div>

      <div className="clipboard-search-container">
        <input
          type="text"
          className="clipboard-search-input"
          placeholder={t("clipboard.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error ? (
        <div className="clipboard-error">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="clipboard-empty">{t("clipboard.noResults")}</div>
      ) : (
        <div className="clipboard-list">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="clipboard-item"
              onClick={() => handleCopy(item)}
            >
              <div className="clipboard-item-content" title={item.content}>
                {item.content}
              </div>
              <button
                className="clipboard-item-delete"
                onClick={(e) => handleDelete(e, item.id)}
                title={t("labels.delete")}
              >
                {t("serverLogsViewer.clearSearch")}
              </button>
            </div>
          ))}
        </div>
      )}

      {snackbarMessage && (
        <div className="clipboard-snackbar">{snackbarMessage}</div>
      )}
    </div>
  );
};

export default Clipboard;
