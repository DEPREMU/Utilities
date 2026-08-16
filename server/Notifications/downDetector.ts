import chalk from "chalk";
import { prisma } from "@/database/postgres.ts";
import { sendFCMNotification } from "@/firebase/admin.ts";
import { getPagination, IntervalTimer } from "./utils";
import { LanguagesSupported, ReasonNotification } from "@types";
import { t, Logger, languagesSupported, Network, Helper } from "@common";

const handleCheckDownServers = async () => {
  try {
    Logger.log("Running DownDetector check...");

    const reason = "downDetector" satisfies ReasonNotification;

    const callback = (skip: number, take: number) =>
      prisma.downDetector.findMany({
        take,
        skip,
        select: { url: true },
        orderBy: [{ userId: "asc" }, { id: "asc" }],
      });

    const usersCallback =
      (url: string, language: LanguagesSupported) =>
      (skip: number, take: number) =>
        prisma.users.findMany({
          where: {
            pushTokens: { some: { token: { not: "" } } },
            userConfig: { language },
            downDetectors: { some: { url } },
          },
          select: {
            pushTokens: {
              where: { token: { not: "" } },
              select: { token: true },
            },
          },
          take,
          skip,
          orderBy: { userId: "asc" },
        });

    let DownDetectors: Awaited<ReturnType<typeof callback>>;

    const { getNext } = getPagination(callback, 50);
    const urlsChecked: Record<string, boolean | undefined> = {};
    const set = new Set<string>();

    while ((DownDetectors = await getNext()).length > 0) {
      DownDetectors.forEach((dd) => set.add(dd.url));
      DownDetectors = [];

      await Helper.Arrays.forEachQueue(5, [...set], async (url) => {
        set.delete(url);
        if (!url) return;

        let urlChecked = urlsChecked[url];
        if (urlChecked === undefined) {
          const isOnline = await Network.isOnlineUrl(url, "get", 2000);
          urlsChecked[url] = isOnline;
          urlChecked = isOnline;
        }
        if (urlChecked) return;

        const translations = Helper.Object.fromEntries(
          languagesSupported.map((lang) => [
            lang,
            {
              title: t("downDetectorNotificationTitle", lang, {
                service: url,
              }),
              body: t("downDetectorNotificationBody", lang, {
                service: url,
              }),
            },
          ]),
        );

        await Helper.Arrays.forEachQueue(
          1,
          languagesSupported,
          async (lang) => {
            const { getNext: getNextUsers } = getPagination(
              usersCallback(url, lang),
            );
            let users: Awaited<ReturnType<ReturnType<typeof usersCallback>>>;

            while ((users = await getNextUsers()).length > 0) {
              const tokens = users.flatMap((u) =>
                u.pushTokens.map((v) => v.token),
              );
              if (tokens.length === 0) continue;

              const { title, body } = translations[lang];

              while (tokens.length > 0) {
                const tokenGroup = tokens.splice(0, 400);

                await sendFCMNotification(tokenGroup, { title, body }, reason, {
                  url,
                  reason,
                  screen: "DownDetector",
                });
              }
            }
          },
        );
      });
    }

    Logger.log(chalk.green("DownDetector check completed"));
  } catch (error) {
    Logger.error(chalk.red("Error in handleCheckDownServers:"), error);
  }
};

export default new IntervalTimer(
  handleCheckDownServers,
  2 * 60 * 1000,
  "downDetector",
);
