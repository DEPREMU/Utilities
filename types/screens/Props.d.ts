type GetRouteParams<T> = {
  route?: {
    params?: T;
  };
};

export type GetParamsScreen<T extends ScreensAvailable> =
  Screens[T] extends GetRouteParams<infer P> ? P : never;

export type Screens = {
  QR: Record<string, never>;
  PDF: GetRouteParams<{ uri?: string }>;
  Home: Record<string, never>;
  Test: Record<string, never>;
  Login: Record<string, never>;
  Games: Record<string, never>;
  Notes: Record<string, never>;
  Vault: Record<string, never>;
  SignUp: Record<string, never>;
  Images: Record<string, never>;
  Cryptos: Record<string, never>;
  Network: Record<string, never>;
  Recorder: Record<string, never>;
  Settings: Record<string, never>;
  Clipboard: Record<string, never>;
  Calculator: Record<string, never>;
  ScanQRCode: Record<string, never>;
  Translator: Record<string, never>;
  SocialMedia: Record<string, never>;
  Minesweeper: Record<string, never>;
  DownDetector: Record<string, never>;
  forgotPassword: Record<string, never>;
  MarkdownViewer: GetRouteParams<{ content?: string }>;
  ComputerControl: Record<string, never>;
  TerminalCommands: Record<string, never>;
  DeviceInformation: Record<string, never>;
};

export type ScreensAvailable = keyof Screens;
