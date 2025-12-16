import { DeviceInformation } from "./screens";
import type { BatteryState } from "react-native-device-info/src/internal/types";
import { ReasonNotification } from "./typesNotifications";

export type LanguagesSupported = "en" | "es";

export type GetPlaceholders<T extends string> =
  T extends `${string}{{${infer K}}}${infer Rest}`
    ? K | GetPlaceholders<Rest>
    : never;

export type HasPlaceholder<T extends string> = GetPlaceholders<T> extends never
  ? false
  : true;

type ResolvePath<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? ResolvePath<T[Key], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

export type typeT = <K extends typeLanguagesKeys>(
  key: K,
  ...args: HasPlaceholder<ResolvePath<typeLanguages, K>> extends true
    ? [options: Record<GetPlaceholders<ResolvePath<typeLanguages, K>>, string>]
    : []
) => string;

/**
 * Represents the structure of language translations.
 *
 * @property key - The key for the translation.
 */
export type typeLanguages = Record<ReasonNotification, string> &
  Record<keyof DeviceInformation, string> &
  Record<BatteryState, string> & {
    user: string;
    close: string;
    infoIP: string;
    success: string;
    dearUser: string;
    cryptoInfo: string;
    welcomeUser: `${string}{{user}}${string}`;
    yourIP: `${string}{{ip}}${string}`;
    location: string;
    organization: string;
    asn: string;
    isp: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    zipcode: string;
    latitude: string;
    longitude: string;
    timezone: string;
    localTime: string;
    isMobile: string;
    isVPN: string;
    isTOR: string;
    isProxy: string;
    isDatacenter: string;
    riskScore: string;
    currency: string;
    continent: string;
    continentCode: string;
    region: string;
    regionName: string;
    as: string;
    asname: string;
    reverse: string;
    district: string;
    asName: string;
    reverseDNS: string;
    utcOffset: string;
    yes: string;
    no: string;
    notAvailable: string;
    isHosting: string;
    status: string;
    selectCurrency: string;
    priceOfCrypto: `${string}{{cryptoName}}${string}`;
    clearCache: string;
    showSelected: string;
    searchCrypto: string;
    ownedAmount: `${string}{{amount}}${string}{{cryptoName}}${string}`;
    firstInvest: `${string}{{amount}}${string}{{cryptoName}}${string}${string}{{price}}${string}`;
    gainAmount: `${string}{{gainAmount}}${string}{{currency}}${string}`;
    noCryptosFound: string;
    showAll: string;
    goToSelectionTab: string;
    myCryptoPortfolio: string;
    noCryptocurrenciesSelected: string;
    autoRefresh: string;
    cryptocurrenciesTracked: string;
    // Login Screen translations
    errorNoSession: string;
    errorNoSessionMessage: string;
    successSignUp: string;
    successSignUpMessage: string;
    verifyEmail: string;
    welcome: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    loginButton: string;
    rememberMe: string;
    forgotPassword: string;
    createAccount: string;
    // SignUp Screen translations
    signUp: string;
    hasAccount: string;
    // Auth success messages
    successLogin: string;
    successLoginMessage: string;
    NoInternetConnection: string;
    PleaseCheckInternetConnection: string;
    // Settings Screen translations
    settings: string;
    adminSection: string;
    passwordAdminSection: string;
    checkPassword: string;
    setWebSocketURL: string;
    webSocketURL: string;
    save: string;
    apiURL: string;
    setApiURL: string;
    exitApp: string;
    exitAppMessage: string;
    back: string;
    backMessage: string;
    datePurchased: `${string}{{date}}${string}`;
    language: string;
    setLanguage: string;
    logout: string;
    notifications: string;
    setNotifications: string;
    notificationInterval: string;
    allNotifications: string;
    appTheme: string;
    auto: string;
    light: string;
    dark: string;
    setTheme: string;
    calculate: string;
    syntaxError: string;
    calculator: string;
    finances: string;
    currentPrice: string;
    games: string;
    minesweeper: string;
    startGame: string;
    easy: string;
    medium: string;
    hard: string;
    flagsRemaining: `${string}{{count}}${string}`;
    youWin: string;
    youLose: string;
    youArePlaying: string;
    successForgotPasswordMessage: string;
    sending: string;
    undo: string;
    clipboard: string;
    clipboardTitle: string;
    remove: string;
    copy: string;
    languageTarget: string;
    enterText: string;
    English: string;
    Spanish: string;
    French: string;
    German: string;
    Italian: string;
    Japanese: string;
    Chinese: string;
    translate: string;
    translation: string;
    translator: string;
    youAreNotLoggedIn: string;
    error: string;
    streamers: string;
    errorLoadingStreamers: string;
    streamerAlreadyAdded: `${string}{{name}}${string}`;
    askAddStreamerTitle: string;
    askAddStreamerBody: `${string}{{name}}${string}`;
    askDeleteStreamer: string;
    askDeleteStreamerBody: `${string}{{name}}${string}`;
    delete: string;
    errorDeletingStreamer: `${string}{{error}}${string}`;
    addStreamer: string;
    yourStreamers: string;
    askOpenURL: `${string}{{url}}${string}`;
    openURL: string;
    Live: string;
    Offline: string;
    socialMedia: string;
    deviceInformation: string;
    batteryLevel: string;
    batteryState: string;
    lowPowerMode: string;
    BatteryFullyCharged: string;
    YouCanUnplugYourDevice: string;
    BatteryLow: string;
    YourBatteryIsLow: string;
    noClipboardData: string;
    clipboardEmptyDescription: string;
    sync: string;
    addToDatabase: string;
    adding: string;
    addTextToClipboard: string;
    enterYourTextHere: string;
    errorOccurred: `${string}{{error}}${string}`;
    failedToAddTextToDatabase: string;
    textAddedToDatabase: string;
    test: string;
    pleaseEnterSomeText: string;
    clipboardWebSocketError: string;
    retry: string;
    foregroundNotificationTitle: string;
    foregroundNotificationMessage: string;
    LocationServicesEnabled: string;
    LocationServicesEnabledMessage: string;
    pause: string;
    stop: string;
    dismiss: string;
    locationPermission: string;
    locationPermissionMessage: string;
    cancel: string;
    accept: string;
    InternetConnectionRestored: string;
    YouAreBackOnline: string;
    overlayPermission: string;
    overlayPermissionMessage: string;
    markdownViewer: string;
    markdownPlaceholder: string;
    batteryOptimizationPermission: string;
    batteryOptimizationPermissionMessage: string;
    autoStartPermission: string;
    autoStartPermissionMessage: string;
    lastUpdateCheck: string;
    checkForUpdates: string;
    updateAvailable: string;
    updateAvailableMessage: string;
    later: string;
    updateNow: string;
    noUpdates: string;
    downDetector: string;
    addNewWebPage: string;
    downDetectorTitle: string;
    visitWebsite: string;
    downDetectorEmptyDescription: string;
    noDownDetectorData: string;
    placeholderNewWebPage: string;
    sendNotification: string;
    pleaseEnterWebPageURL: string;
    webPageMustStartWithHTTP: string;
    webPageAddedSuccessfully: string;
    computerControl: string;
    turnOffComputer: string;
    restartComputer: string;
    noDevices: string;
    searchingDevices: string;
    computerControlTitle: string;
    scanning: string;
    search: string;
    turnOffCommandSent: string;
    turnOffCommandFailed: string;
    restartCommandSent: string;
    restartCommandFailed: string;
    terminalCommands: string;
    command: string;
    enterCommand: string;
    "executeOnStart-up": string;
    "executeOnShut-down": string;
    addCommand: string;
    noCommandsAdded: string;
    commandSentSuccessfully: string;
    commandFailed: string;
    commandExecutionFailed: string;
    commandExecuted: string;
    commandOutput: string;
    askExecuteCommand: string;
    confirmExecuteCommand: string;
    execute: string;
    executingCommand: string;
    noOutput: string;
    loggingIn: string;
    currentVersion: `${string}{{version}}${string}`;
    appUpdates: string;
    appUpdatesExplanation: string;
    openUpdatesWebPage: string;
    ourUpdatesWebPage: string;
    requestingCameraPermission: string;
    noCameraPermission: string;
    needsCameraPermission: string;
    qrLoginSuccessTitle: string;
    qrLoginSuccessMessage: string;
    scanQRCode: string;
    loginWithEmail: string;
    loginWithQR: string;
    generatingQRCode: string;
    loggingInWithQRCode: string;
    scanQRCodeInstructions: string;
    processingQRCode: string;
    qrLoginErrorTitle: string;
    qrLoginErrorMessage: string;
    noMoreData: string;
    showDeleted: string;
    restoreAll: string;
    deleteAll: string;
    restore: string;
    images: {
      imageSize: `${string}{{size}}${string}`;
      imageType: `${string}{{type}}${string}`;
      labelImages: string;
      canConvertToFormat: `${string}{{format}}${string}`;
      changeImageFormatTitle: string;
      deleteImageButtonLabel: string;
      selectImageButtonLabel: string;
      permissionRequiredTitle: string;
      downloadImageButtonLabel: string;
      changeImageFormatTabTitle: string;
      permissionRequiredMessage: string;
      downloadImageSuccessMessage: string;
      changeImageFormatDescription: string;
      downloadImageAlbumButtonLabel: `${string}{{albumName}}${string}`;
      errorWhileSavingImageAlertTitle: string;
      errorWhileConvertingImageMessage: string;
      imageDownloadedInAlbumAlertTitle: string;
      errorWhileSavingImageAlertMessage: `${string}{{imageName}}${string}`;
      imageDownloadedInAlbumAlertMessage: `${string}{{albumName}}${string}`;
    };
  };

export type typeLanguagesServer = {
  internalError: string;
  notificationCryptoBody: string;
  notificationCryptoTitle: string;
  streamerLiveNotification: string;
  streamerLiveNotificationTitle: string;
  downDetectorNotificationBody: string;
  downDetectorNotificationTitle: string;
  notificationServerRestartBody: string;
  notificationServerRestartTitle: string;
  notificationNotCryptosSelectedBody: string;
  notificationNotCryptosSelectedTitle: string;
  auth: {
    userNotFound: string;
    tokenRequired: string;
    invalidPassword: string;
    sessionNotFound: string;
    deviceIdRequired: string;
    wrongCredentials: string;
    passwordNotStrong: string;
    invalidCredentials: string;
    invalidEmailFormat: string;
    accountAlreadyExists: string;
    deviceInfoIsRequired: string;
    emailAndPasswordRequired: string;
    tokenAndDeviceIdRequired: string;
  };
  database: {
    fetchError: string;
    insertError: string;
    updateError: string;
    deleteError: string;
    invalidBody: string;
  };
  images: {
    formatChangeError: string;
    invalidImageFormat: string;
    invalidImageBuffer: string;
  };
};

type Paths<T, Prev extends string = ""> = {
  [K in keyof T]: T[K] extends object
    ? Paths<T[K], `${Prev}${K & string}.`>
    : `${Prev}${K & string}`;
}[keyof T];

export type typeLanguagesKeys = Paths<typeLanguages>;
export type typeLanguagesServerKeys = Paths<typeLanguagesServer>;
