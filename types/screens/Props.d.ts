type GetRouteParams<T> = {
  route?: {
    params?: T;
  };
};

export type GetParamsScreen<T extends ScreensAvailable> =
  Screens[T] extends GetRouteParams<infer P> ? P : never;

export type Screens = {
  QR: {};
  PDF: GetRouteParams<{ uri?: string }>;
  Home: {};
  Test: {};
  Login: {};
  Games: {};
  Notes: {};
  Vault: {};
  SignUp: {};
  Images: {};
  Cryptos: {};
  Network: {};
  Recorder: {};
  Settings: {};
  Clipboard: {};
  Calculator: {};
  ScanQRCode: {};
  Translator: {};
  SocialMedia: {};
  Minesweeper: {};
  DownDetector: {};
  forgotPassword: {};
  MarkdownViewer: GetRouteParams<{ content?: string }>;
  ComputerControl: {};
  TerminalCommands: {};
  DeviceInformation: {};
};

export type ScreensAvailable = keyof Screens;
