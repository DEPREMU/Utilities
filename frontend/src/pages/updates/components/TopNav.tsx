import React from "react";
import { ThemeLanguageToggle } from "../../common/components/ThemeLanguageToggle";
import { useTranslation } from "react-i18next";

export const TopNav: React.FC = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div className="updates-topnav">
      <div className="updates-topnav-title">{t("updatesWebPage.options")}</div>

      <div className="updates-topnav-actions">
        <ThemeLanguageToggle />
      </div>
    </div>
  );
});
