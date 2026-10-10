import React from "react";
import { useTheme } from "@/pages/context/ThemeContext";
import { Sun, Moon } from "lucide";
import { MorphIcon } from "morphicons/react";
import { useTranslations } from "@/pages/context/useTranslations";

interface ThemeLanguageToggleProps {
  showLanguage?: boolean;
}

export const ThemeLanguageToggle: React.FC<ThemeLanguageToggleProps> = ({
  showLanguage = true,
}) => {
  const { t } = useTranslations();
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
