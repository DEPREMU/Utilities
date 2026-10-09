import React from "react";
import { useTranslations } from "@/pages/context/useTranslations";
import { ThemeLanguageToggle } from "@/pages/common/components/ThemeLanguageToggle";

export const TopNav: React.FC = React.memo(() => {
  const { t } = useTranslations();

  return (
    <div className="updates-topnav">
      <div className="updates-topnav-title">{t("updatesWebPage.options")}</div>

      <div className="updates-topnav-actions">
        <ThemeLanguageToggle />
      </div>
    </div>
  );
});
