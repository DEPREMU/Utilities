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
  internalError: "Error interno del servidor",
  downDetectorNotificationTitle: "Servicio caído: {{service}}",
  downDetectorNotificationBody:
    "El servicio {{service}} está experimentando problemas actualmente.",
  auth: {
    passwordNotStrong:
      "La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número",
    emailAndPasswordRequired: "Se requiere correo electrónico y contraseña",
    invalidCredentials: "Credenciales inválidas",
    accountAlreadyExists: "Ya existe una cuenta con este correo electrónico",
    tokenRequired: "Se requiere un token",
    userNotFound: "Usuario no encontrado",
    invalidPassword: "Contraseña inválida",
    wrongCredentials: "Correo electrónico o contraseña incorrectos",
    deviceIdRequired: "Se requiere ID de dispositivo",
    tokenAndDeviceIdRequired: "Se requieren token y ID de dispositivo",
    deviceInfoIsRequired: "Se requiere información del dispositivo",
  },
  supabase: {
    fetchError: "Error al obtener datos de la base de datos",
    insertError: "Error al insertar datos en la base de datos",
    updateError: "Error al actualizar datos en la base de datos",
    deleteError: "Error al eliminar datos de la base de datos",
  },
};

export default es;
