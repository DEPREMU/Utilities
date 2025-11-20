"use strict";
/* eslint-disable no-undef */

let language = navigator.language || navigator.userLanguage;
if (language.indexOf("-") !== -1) {
  language = language.split("-")[0];
}
if (language.indexOf("_") !== -1) {
  language = language.split("_")[0];
}

const translations = {
  "download-latest-version": {
    en: "Download Latest Version",
    es: "Descargar la última versión",
  },
};
const t = (key) => {
  return translations?.[key] && translations[key][language]
    ? translations[key][language]
    : translations[key]["en"];
};

window.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("root");
  document.title = t("download-latest-version");
  const links = (
    await Promise.all(
      ["windows", "linux", "android"].map(async (platform) => {
        try {
          const res = await fetch("{{UPDATES_SERVER_URL}}", {
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

          const a = document.createElement("a");
          a.textContent = `${t("download-latest-version")}: ${data.latestVersion}`;
          a.href = data.downloadUrl;

          const div = document.createElement("div");
          div.textContent = platform.toUpperCase();
          div.className = "platform-link";

          div.appendChild(a);
          return div;
        } catch (error) {
          console.error(error);
          return Promise.resolve(null);
        }
      }),
    )
  ).filter((link) => link !== null);
  links.forEach((link) => root.appendChild(link));
});
