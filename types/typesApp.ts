export type Window = {
  UtilitiesForPC?: {
    readClipboard: () => string;
    setClipboard: (text: string) => void;
    notifyLoginStatus: (isLoggedIn: boolean) => void;
  };
};
