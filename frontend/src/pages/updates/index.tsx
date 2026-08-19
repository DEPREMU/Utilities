import "./index.css";
import { t } from "../../utils/t";
import { TopNav } from "./components/TopNav";
import { UpdatesGrid } from "./components/UpdatesGrid";
import { Helper, REPLACERS, ServerFetch } from "@common";
import React, { useEffect, useState } from "react";
import type { Enums } from "@types";

interface UpdateInfo {
  downloadUrl: string;
  latestVersion: string;
}

const Updates: React.FC = () => {
  const [updates, setUpdates] = useState<
    Record<Exclude<Enums["UpdateType"], "web">, UpdateInfo | null>
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
        UpdateInfo | null
      > = {
        linux: null,
        android: null,
        windows: null,
      };

      await Promise.all(
        Helper.Object.keys(results).map(async (buildType) => {
          try {
            const res = await ServerFetch.get(
              `/updates/is-update-available/:version/:buildType`,
              { params: { version: "0.0.0", buildType } },
            );
            if (res.data && res.data.downloadUrl) {
              results[buildType] = {
                downloadUrl: res.data.downloadUrl,
                latestVersion: res.data.latestVersion,
              };
            }
          } catch (error) {
            REPLACERS.Logger.error(
              "Failed to fetch update for",
              buildType,
              error,
            );
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
          <UpdatesGrid isLoading={isLoading} updates={updates} />
        </div>
      </div>
    </div>
  );
};

export default Updates;
