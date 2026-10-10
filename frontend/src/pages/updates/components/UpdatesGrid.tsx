import React from "react";
import { motion } from "motion/react";
import { useTranslations } from "@/pages/context/useTranslations";

interface UpdateInfo {
  downloadUrl: string;
  latestVersion: string;
}

interface UpdatesGridProps {
  isLoading: boolean;
  updates: Record<"linux" | "android" | "windows", UpdateInfo | null>;
}

const platformIcons: Record<"windows" | "linux" | "android", string> = {
  windows: "/assets/platforms/windows.svg",
  linux: "/assets/platforms/linux.svg",
  android: "/assets/platforms/android.svg",
};

export const UpdatesGrid: React.FC<UpdatesGridProps> = ({
  isLoading,
  updates,
}) => {
  const { t } = useTranslations();

  if (isLoading) {
    return <div className="updates-loading">{t("updatesWebPage.loading")}</div>;
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
          t("updatesWebPage.downloadLatestVersion") + ": " + info.latestVersion;
        return (
          <motion.div
            key={platform}
            className="updates-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="updates-card-header">
              <img
                alt={platformKey}
                src={platformIcons[platformKey]}
                className="updates-platform-icon"
              />
              <h3>
                {t(`updatesWebPage.${platformKey}`) || platform.toUpperCase()}
              </h3>
            </div>
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
