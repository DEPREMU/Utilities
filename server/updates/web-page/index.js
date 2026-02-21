/* eslint-disable no-console */
"use strict";

let language = navigator.language || navigator.userLanguage;
if (language.indexOf("-") !== -1) {
  language = language.split("-")[0];
}
if (language.indexOf("_") !== -1) {
  language = language.split("_")[0];
}

const UPDATES_SERVER_URL =
  "https://utilities.depremu.com/updates/is-update-available";

const translations = {
  en: {
    "download-latest-version": "Download Latest Version",
    "error-loading-updates": "Error loading download links.",
  },
  es: {
    "download-latest-version": "Descargar la última versión",
    "error-loading-updates": "Error al cargar los enlaces de descarga.",
  },
};

const t = (key) => {
  return translations?.[language] && translations[language][key]
    ? translations[language][key]
    : translations["en"][key];
};

window.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("root");
  document.title = t("download-latest-version");

  const links = (
    await Promise.all(
      ["windows", "linux", "android"].map(async (platform) => {
        try {
          const res = await fetch(UPDATES_SERVER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platformOS: platform,
              currentVersion: "0.0.0",
              buildType: platform === "android" ? platform : "electron",
            }),
          });

          const data = await res.json();

          const button = document.createElement("button");
          button.textContent = `${t("download-latest-version")}: ${data.latestVersion}`;
          button.className = "download-btn";

          const handlePress = async (downloadUrl) => {
            window.open(downloadUrl, "_blank");
          };

          button.addEventListener("click", () => handlePress(data.downloadUrl));

          const div = document.createElement("div");
          div.textContent = platform.toUpperCase();
          div.className = "platform-link";

          div.appendChild(button);
          return div;
        } catch (error) {
          console.error(error);
          return Promise.resolve(null);
        }
      }),
    )
  ).filter((link) => link !== null);

  if (links.length > 0) links.forEach((link) => root.appendChild(link));
  else {
    const errorMsg = document.createElement("p");
    errorMsg.textContent = t("error-loading-updates");
    root.appendChild(errorMsg);
  }
});
