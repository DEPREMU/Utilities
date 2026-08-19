import React from "react";
import { t } from "@utils";
import { Sun, Moon } from "lucide";
import { MorphIcon } from "morphicons/react";
import { useTheme } from "../contexts/ThemeContext";

interface ThemeLanguageToggleProps {
  showLanguage?: boolean;
}

export const ThemeLanguageToggle: React.FC<ThemeLanguageToggleProps> = ({ showLanguage = true }) => {
  const { theme, toggleTheme, language, toggleLanguage } = useTheme();
  
  const Icon = React.useMemo(() => (theme === "light" ? Sun : Moon), [theme]);

  return (
    <>
      {showLanguage && (
        <button
          className="logs-btn updates-topnav-btn"
          onClick={toggleLanguage}
        >
          {t("updatesWebPage.language") +
            " " +
            t("common.openBracket") +
            language.toUpperCase() +
            t("common.closeBracket")}
        </button>
      )}
      <button className="logs-btn updates-topnav-btn" onClick={toggleTheme}>
        <MorphIcon icon={Icon} />
        {t("updatesWebPage.themeToggle") +
          " " +
          t("common.openBracket") +
          theme +
          t("common.closeBracket")}
      </button>
    </>
  );
};
