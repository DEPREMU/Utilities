import type { typeLanguagesServer } from "../../types";

const es: typeLanguagesServer = {
  notificationCryptoTitle: "Actualización de criptomonedas: {{cryptos}}",
  notificationCryptoBody:
    "El precio actual de {{crypto}} es {{price}} {{gainPercent}}.",
  notificationNotCryptosSelectedBody:
    "No hay criptomonedas seleccionadas para notificaciones.\nVe a la selección de criptomonedas para recibir actualizaciones.",
  notificationNotCryptosSelectedTitle: "Sin criptomonedas seleccionadas",
  streamerLiveNotification: "¡Tu streamer favorito {{streamer}} está en vivo!",
  streamerLiveNotificationTitle: "Streamer en vivo: {{streamer}}",
};

export default es;
