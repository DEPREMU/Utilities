import chalk from "chalk";
import axios from "axios";
import { prisma } from "@/database/postgres.ts";
import { sendFCMNotification } from "@/firebase/admin.ts";
import { t, Logger, languagesSupported } from "@common";
import { LanguagesSupported, ReasonNotification } from "@types";

const isDown = async (url: string): Promise<boolean> => {
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.status >= 200 && res.status < 400) return false;
  } catch (error) {
    Logger.log(`Error fetching ${url}:`, error);
  }
  return true;
};

const handleCheckDownServers = async () => {
  Logger.log("Running DownDetector check...");

  const USERS = await prisma.users.findMany({
    where: {
      pushTokens: { some: { token: { not: "" } } },
      downDetectors: { some: { url: { not: "" } } },
    },
    include: {
      userConfig: { select: { language: true } },
      pushTokens: {
        where: { token: { not: "" } },
        select: { token: true },
      },
      downDetectors: {
        where: { url: { startsWith: "http" } },
        select: { url: true },
      },
    },
  });

  const users = USERS.map((u) => ({
    ...u,
    downDetectors: u.downDetectors.map((dd) => ({
      ...dd,
      url: dd.url.toLowerCase(),
    })),
  })).filter(
    (user) => user.pushTokens.length > 0 && user.downDetectors.length > 0,
  );

  const downWebURLs = new Set<string>(
    users.flatMap((u) => u.downDetectors.map((dd) => dd.url)),
  );

  await Promise.all(
    [...downWebURLs].map(async (url) => {
      if (!(await isDown(url))) downWebURLs.delete(url);
    }),
  );

  const usersData: {
    urls: Set<string>;
    lang: LanguagesSupported;
    tokens: Set<string>;
    userId: string;
  }[] = [];

  users.forEach((user) => {
    if (!user.userConfig) return;

    const urls = new Set(
      user.downDetectors
        .filter((dd) => downWebURLs.has(dd.url))
        .map((dd) => dd.url),
    );
    if (urls.size === 0) return;

    const tokens = new Set(user.pushTokens.map((pt) => pt.token));

    usersData.push({
      urls,
      tokens,
      lang: user.userConfig.language,
      userId: user.userId,
    });
  });

  downWebURLs.forEach((webURL) => {
    const users = usersData.filter((ud) => ud.urls.has(webURL));
    if (users.length === 0) return;

    languagesSupported.forEach((lang) => {
      const usersLang = users.filter((u) => u.lang === lang);
      if (usersLang.length === 0) return;

      const tokens = usersLang.flatMap((u) => [...u.tokens]);
      if (tokens.length === 0) return;

      const title = t("downDetectorNotificationTitle", lang, {
        service: webURL,
      });
      const body = t("downDetectorNotificationBody", lang, {
        service: webURL,
      });
      const reason = "downDetector" satisfies ReasonNotification;

      sendFCMNotification(tokens, { title, body }, reason, {
        url: webURL,
        reason,
        screen: "DownDetector",
      });
    });
  });
};

const getInterval = () => {
  Logger.log(chalk.blue("Starting DownDetector interval..."));

  return setInterval(handleCheckDownServers, 5 * 60 * 1000);
};

export default getInterval;
