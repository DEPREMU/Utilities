import type { typeLanguagesServer } from "../../types";

const es: typeLanguagesServer = {
  notificationCryptoTitle: "Actualización de criptomonedas: {{cryptos}}",
  notificationCryptoBody:
    "El precio actual de {{crypto}} es {{price}} {{gainPercent}}.",
  notificationNotCryptosSelectedBody:
    "No hay criptomonedas seleccionadas para notificaciones.\nVe a la selección de criptomonedas para recibir actualizaciones.",
  notificationNotCryptosSelectedTitle: "Sin criptomonedas seleccionadas",
};

export default es;
