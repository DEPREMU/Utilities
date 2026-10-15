import "./index.css";
import { logger } from "@/utils";
import { TopNav } from "./components/TopNav";
import type { Enums } from "@types";
import { DownloadsGrid } from "./components/DownloadsGrid";
import { useTranslations } from "@/pages/context/useTranslations";
import { Helper, ServerFetch } from "@common";
import React, { useEffect, useState } from "react";

interface DownloadsInfo {
  downloadUrl: string;
  latestVersion: string;
}

const Downloads: React.FC = () => {
  const { t } = useTranslations();

  const [updates, setUpdates] = useState<
    Record<Exclude<Enums["UpdateType"], "web">, DownloadsInfo | null>
  >({
    linux: null,
    android: null,
    windows: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      const results: Record<
        Exclude<Enums["UpdateType"], "web">,
        DownloadsInfo | null
      > = {
        linux: null,
        android: null,
        windows: null,
      };

      await Promise.all(
        Helper.Object.keys(results).map(async (buildType) => {
          try {
            const res = await ServerFetch.get(
              `/downloads/is-update-available/:version/:buildType`,
              { params: { version: "0.0.0", buildType } },
            );
            if ("downloadUrl" in res.data && res.data.downloadUrl) {
              results[buildType] = {
                downloadUrl: res.data.downloadUrl,
                latestVersion: res.data.latestVersion,
              };
            }
          } catch (error) {
            logger.error("Failed to fetch update for", buildType, error);
          }
        }),
      );
      setUpdates(results);
      setIsLoading(false);
    };

    fetchUpdates();
  }, []);

  return (
    <div className="updates-container">
      <TopNav />
      <div className="updates-content">
        <div className="updates-header-container">
          <h2>{t("updatesWebPage.downloadLatestVersion")}</h2>
        </div>
        <div className="updates-main-area">
          <DownloadsGrid isLoading={isLoading} downloads={updates} />
        </div>
      </div>
    </div>
  );
};

export default Downloads;
