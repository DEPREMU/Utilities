import React from "react";
import { t } from "@utils";
import { motion } from "motion/react";

interface UpdateInfo {
  downloadUrl: string;
  latestVersion: string;
}

interface UpdatesGridProps {
  isLoading: boolean;
  updates: Record<"linux" | "android" | "windows", UpdateInfo | null>;
}

export const UpdatesGrid: React.FC<UpdatesGridProps> = ({ isLoading, updates }) => {
  if (isLoading) {
    return <div className="updates-loading">{t("serverLogsViewer.loading")}</div>;
  }

  const hasUpdates = Object.values(updates).some((u) => u !== null);

  if (!hasUpdates) {
    return (
      <div className="updates-error">
        {t("updatesWebPage.errorLoadingUpdates")}
      </div>
    );
  }

  return (
    <div className="updates-grid">
      {Object.entries(updates).map(([platform, info]) => {
        if (!info) return null;
        const platformKey = platform as "windows" | "linux" | "android";
        const btnText =
          t("updatesWebPage.downloadLatestVersion") +
          ": " +
          info.latestVersion;
        return (
          <motion.div
            key={platform}
            className="updates-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <h3>
              {t(`updatesWebPage.${platformKey}`) || platform.toUpperCase()}
            </h3>
            <button
              className="logs-btn updates-btn-download"
              onClick={() => window.open(info.downloadUrl, "_blank")}
            >
              {btnText}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};
