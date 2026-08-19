import React from "react";
import { t } from "@utils";
import { ThemeLanguageToggle } from "../../common/components/ThemeLanguageToggle";

export const TopNav: React.FC = React.memo(() => {
  return (
    <div className="updates-topnav">
      <div className="updates-topnav-title">
        {t("updatesWebPage.options")}
      </div>

      <div className="updates-topnav-actions">
        <ThemeLanguageToggle />
      </div>
    </div>
  );
});
