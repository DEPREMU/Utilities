import type { typeLanguagesServer } from "../../types";

const en: typeLanguagesServer = {
  notificationCryptoTitle: "Crypto Update: {{cryptos}}",
  notificationCryptoBody:
    "The current price of {{crypto}} is {{price}} {{gainPercent}}.",
  notificationNotCryptosSelectedBody:
    "No cryptos selected for notifications.\nGo to crypto selection to receive updates.",
  notificationNotCryptosSelectedTitle: "No Cryptos Selected",
  streamerLiveNotification: "Your favorite streamer {{streamer}} is now live!",
  streamerLiveNotificationTitle: "Streamer Live: {{streamer}}",
};

export default en;
