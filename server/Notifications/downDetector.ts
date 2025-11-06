import chalk from "chalk";
import axios from "axios";
import { t } from "../translations/index.ts";
import { dataDatabase } from "./fetchData.ts";
import { LanguagesSupported } from "@types";
import { sendFCMNotification } from "../firebase/admin.ts";

const isDown = async (url: string): Promise<boolean> => {
  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.status >= 200 && res.status < 400) return false;
  } catch (error) {
    console.log(`Error fetching ${url}:`, error);
  }
  return true;
};

const handleCheckDownServers = async () => {
  console.log("Running DownDetector check...");

  const dataPushTokens = dataDatabase.PushTokens;
  const dataUserConfig = dataDatabase.UserConfig;
  const dataDownDetector = dataDatabase.DownDetector;

  dataDownDetector.forEach((downDetector) => {
    if (
      dataDownDetector.find(
        (dd) => dd.url.toLowerCase() === downDetector.url.toLowerCase(),
      )
    )
      return;
    dataDownDetector.push(downDetector);
  });

  dataPushTokens.forEach((pushToken) => {
    if (dataPushTokens.find((pt) => pt.token === pushToken.token)) return;
    dataPushTokens.push(pushToken);
  });

  dataUserConfig.forEach((userConfig) => {
    if (dataUserConfig.find((uc) => uc.userId === userConfig.userId)) return;
    dataUserConfig.push(userConfig);
  });

  const downWebURLs = (
    await Promise.all(
      dataDownDetector.map(async (dd) =>
        (await isDown(dd.url)) ? dd.url : null,
      ),
    )
  ).filter((url): url is string => !!url);

  const usersData: {
    lang: LanguagesSupported;
    token: string | string[];
    url: string | string[];
    userId: string;
  }[] = [];

  dataUserConfig.forEach((userConfig) => {
    const userPushTokens = dataPushTokens.filter(
      (pt) => pt.userId === userConfig.userId,
    );
    const userUrls = dataDownDetector.filter(
      (dd) => dd.userId === userConfig.userId,
    );
    if (userPushTokens.length === 0 || userUrls.length === 0) return;

    usersData.push({
      lang: userConfig.language as LanguagesSupported,
      token: userPushTokens.map((upt) => upt.token),
      url: userUrls.map((url) => url.url),
      userId: userConfig.userId,
    });
  });
  console.log("Down URLs detected:", downWebURLs);

  const languages: LanguagesSupported[] = ["en", "es"];

  downWebURLs.forEach((webURL) => {
    const users = usersData.filter((ud) => ud.url.includes(webURL));
    if (users.length === 0) return;

    languages.forEach((lang) => {
      const langType = lang as LanguagesSupported;

      const usersLang = users.filter((u) => u.lang === langType);
      if (usersLang.length === 0) return;
      const tokens = usersLang.flatMap((u) => u.token);
      const title = t("downDetectorNotificationTitle", langType, {
        service: webURL,
      });
      const body = t("downDetectorNotificationBody", langType, {
        service: webURL,
      });
      sendFCMNotification(tokens, { title, body }, "downDetector", {
        screen: "DownDetector",
        url: webURL,
      });
    });
  });
};

const getInterval = () => {
  console.log(chalk.blue("Starting DownDetector interval..."));

  return setInterval(handleCheckDownServers, 5 * 60 * 1000);
};

export default getInterval;
