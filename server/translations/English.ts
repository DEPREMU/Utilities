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
  internalError: "Internal server error",
  auth: {
    passwordNotStrong:
      "Password must be at least 8 characters long and contain at least one letter and one number",
    emailAndPasswordRequired: "email and password are required",
    invalidCredentials: "Invalid email or password",
    accountAlreadyExists: "An account with this email already exists",
    tokenRequired: "Token is required",
    userNotFound: "User not found",
    invalidPassword: "Invalid password",
    wrongCredentials: "Wrong email or password",
    deviceIdRequired: "Device ID is required",
    tokenAndDeviceIdRequired: "Token and Device ID are required",
    deviceInfoIsRequired: "Device information is required",
  },
  supabase: {
    fetchError: "Error fetching data from the database",
    insertError: "Error inserting data into the database",
    updateError: "Error updating data in the database",
    deleteError: "Error deleting data from the database",
  },
};

export default en;
