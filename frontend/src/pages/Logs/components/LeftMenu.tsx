import React from "react";
import { t } from "../../../utils/t";

interface LeftMenuProps {
  search: string;
  setSearch: (val: string) => void;
  availableTags: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const LeftMenu: React.FC<LeftMenuProps> = React.memo(
  ({
    search,
    setSearch,
    availableTags,
    selectedTags,
    setSelectedTags,
    theme,
    toggleTheme,
  }) => {
    const handleTagToggle = (tag: string) => {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
      );
    };

    return (
      <div className="logs-sidebar">
        <div className="logs-sidebar-title">
          {t("serverLogsViewer.searchPlaceholder")}
        </div>
        <div className="logs-search-wrapper">
          <input
            type="text"
            className="logs-search"
            placeholder={t("serverLogsViewer.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="logs-search-clear"
              onClick={() => setSearch("")}
              title={t("serverLogsViewer.clearSearch")}
            >
              {t("serverLogsViewer.clearSearch")}
            </button>
          )}
        </div>

        <div className="logs-sidebar-title logs-mt-1rem">
          {t("serverLogsViewer.allTags")}
        </div>
        <div className="logs-tag-list">
          {availableTags.map((tag) => (
            <label key={tag} className="logs-tag-label">
              <input
                type="checkbox"
                className="logs-tag-checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => handleTagToggle(tag)}
              />
              {t("common.openBracket")}
              {tag}
              {t("common.closeBracket")}
            </label>
          ))}
        </div>

        <div className="logs-mt-auto-pt-1rem">
          <button className="logs-btn" onClick={toggleTheme}>
            {/* eslint-disable-next-line react-native/no-raw-text */}
            {t("serverLogsViewer.themeToggle")} {t("common.openBracket")}
            {theme}
            {t("common.closeBracket")}
          </button>
        </div>
      </div>
    );
  },
);
