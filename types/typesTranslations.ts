import { ReasonNotification } from "./typesNotifications";

export type LanguagesSupported = "en" | "es";

/**
 * Represents the structure of language translations.
 *
 * @property key - The key for the translation.
 */
export type typeLanguages = Record<ReasonNotification, string> & {
  user: string;
  close: string;
  infoIP: string;
  success: string;
  dearUser: string;
  cryptoInfo: string;
  welcomeUser: string;
  yourIP: string;
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
  priceOfCrypto: string;
  clearCache: string;
  showSelected: string;
  searchCrypto: string;
  ownedAmount: string;
  firstInvest: string;
  gainAmount: string;
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
  datePurchased: string;
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
  flagsRemaining: string;
  youWin: string;
  youLose: string;
  youArePlaying: string;
};

export type typeLanguagesServer = {
  notificationCryptoBody: string;
  notificationCryptoTitle: string;
  notificationNotCryptosSelectedBody: string;
  notificationNotCryptosSelectedTitle: string;
};
