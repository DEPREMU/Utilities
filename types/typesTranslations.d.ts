import type { BatteryState } from "react-native-device-info/src/internal/types";
import type { DeviceInformation } from "./screens";
import type { ReasonNotification } from "./typesNotifications";

export type LanguagesSupported = "en" | "es";

type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

type RemovePluralSuffix<K> = K extends `${infer Base}_${PluralSuffix}`
  ? Base
  : K;

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6];

export type Paths<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]:
          | (K & string)
          | (Paths<T[K], Prev[D]> extends infer P
              ? P extends string
                ? `${K & string}.${P}`
                : never
              : never);
      }[keyof T]
    : never;

type NormalizePath<P extends string> = P extends `${infer A}.${infer B}`
  ? `${A}.${NormalizePath<B>}`
  : RemovePluralSuffix<P>;

type NormalizeKeys<T> = NormalizePath<Paths<T>>;

type ResolvePath<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? ResolvePath<T[Key], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type ResolvePlural<T, K extends string> =
  ResolvePath<T, `${K}_one`> extends never
    ? ResolvePath<T, K>
    : ResolvePath<T, `${K}_one`> | ResolvePath<T, `${K}_other`>;

type HasPlural<T, K extends string> =
  ResolvePath<T, `${K}_one`> extends never ? false : true;

export type GetPlaceholders<T extends string> =
  T extends `${string}{{${infer K}}}${infer Rest}`
    ? K | GetPlaceholders<Rest>
    : never;

export type HasPlaceholder<T extends string> =
  GetPlaceholders<T> extends never ? false : true;

export type GetTranslationReturn<T, K extends string> =
  ResolvePath<T, K> extends never
    ? ResolvePath<T, `${K}_one`> extends never
      ? never
      : string
    : ResolvePath<T, K>;

export type TranslationArgs<T, K extends string> =
  HasPlural<T, K> extends true
    ? HasPlaceholder<ResolvePlural<T, K> & string> extends true
      ? [
          options: Record<
            GetPlaceholders<ResolvePlural<T, K> & string> | "count",
            string | number
          >,
        ]
      : [options?: { count: number }]
    : [ResolvePath<T, K>] extends [string]
      ? HasPlaceholder<ResolvePath<T, K> & string> extends true
        ? [options: Record<GetPlaceholders<ResolvePath<T, K> & string>, string>]
        : []
      : [];

export type typeT<TLang = AppTranslations> = <K extends NormalizeKeys<TLang>>(
  key: K,
  ...args: TranslationArgs<TLang, K>
) => GetTranslationReturn<TLang, K>;

type DeviceInformationTranslations = {
  deviceInformation: Record<
    keyof DeviceInformation | "title" | "keyWords" | "description",
    string
  >;
};

type BatteryStateTranslations = {
  batteryState: Record<
    | Exclude<BatteryState, "unknown">
    | "BatteryLow"
    | "YourBatteryIsLow"
    | "BatteryFullyCharged"
    | "YouCanUnplugYourDevice",
    string
  >;
};

type NotificationsTranslations = {
  notifications: Record<
    | ReasonNotification
    | "sendNotification"
    | "foregroundService"
    | "LocationServicesEnabled"
    | "foregroundNotificationTitle"
    | "foregroundNotificationMessage"
    | "LocationServicesEnabledMessage",
    string
  >;
};

export type AppTranslations = BatteryStateTranslations &
  NotificationsTranslations &
  DeviceInformationTranslations & {
    homeScreen: {
      help: `${string}{{commandToHome}}${string}`;
      keyWords: `${string}{{keyWords}}${string}`;
      needsInternet: `${string}{{featureName}}${string}`;
      noNeedsInternet: `${string}{{featureName}}${string}`;
      needSession: `${string}{{featureName}}${string}`;
      noNeedsSession: `${string}{{featureName}}${string}`;
    };
    downDetector: {
      title: string;
      keyWords: string;
      description: string;
      addNewWebPage: string;
      noDataAvailable: string;
      emptyDescription: string;
      placeholderNewWebPage: string;
      pleaseEnterWebPageURL: string;
      webPageMustStartWithHTTP: string;
      webPageAddedSuccessfully: string;
    };
    network: {
      keyWords: string;
      description: string;
      networkInfo: {
        title: string;
        refresh: string;
        general: string;
        details: string;
        lastUpdated: `${string}{{time}}${string}`;
      };
      infoIP: string;
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
      isHosting: string;
      status: string;
    };
    calculator: {
      title: string;
      keyWords: string;
      finances: {
        title: string;
      };
      calculate: string;
      description: string;
      syntaxError: string;
      timeToDownload: {
        scale: `${string}{{scale}}${string}`;
        title: string;
        result: string;
        fileSize: string;
        finished: string;
        scaleFactor: string;
        finishedMessage: `${string}{{time}}${string}`;
        setAlarmWhenDone: `${string}{{time}}${string}`;
        internetSpeedMbps: string;
      };
    };
    languages: {
      English: string;
      Spanish: string;
      French: string;
      German: string;
      Italian: string;
      Japanese: string;
      Chinese: string;
    };
    translator: {
      title: string;
      keyWords: string;
      enterText: string;
      translate: string;
      description: string;
      translation: string;
      languageTarget: string;
    };
    user: {
      label: string;
      dearUser: string;
      welcomeUser: `${string}{{user}}${string}`;
    };
    streamers: {
      addStreamer: string;
      yourStreamers: string;
      Live: string;
      Offline: string;
      title: string;
      errorLoadingStreamers: string;
      streamerAlreadyAdded: `${string}{{name}}${string}`;
      askAddStreamerTitle: string;
      askAddStreamerBody: `${string}{{name}}${string}`;
      askDeleteStreamer: string;
      askDeleteStreamerBody: `${string}{{name}}${string}`;
    };
    socialMedia: {
      title: string;
      keyWords: string;
      description: string;
    };
    test: {
      title: string;
    };
    verifications: {
      pleaseEnterSomeText: string;
    };
    markdown: {
      title: string;
      keyWords: string;
      description: string;
      placeholder: string;
      showAsMarkdown: string;
      showAsPlainText: string;
    };
    computerControl: {
      title: string;
      keyWords: string;
      scanning: string;
      noDevices: string;
      description: string;
      searchingDevices: string;
    };
    terminalCommands: {
      turnOffComputer: string;
      restartComputer: string;
      keyWords: string;
      description: string;
      turnOffCommandSent: string;
      turnOffCommandFailed: string;
      restartCommandSent: string;
      restartCommandFailed: string;
      title: string;
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
    };
    appInfo: {
      appUpdates: string;
      appVersion: `${string}{{version}}${string}`;
      currentVersion: `${string}{{version}}${string}`;
      YouAreBackOnline: string;
      appUpdatesExplanation: string;
      InternetConnectionRestored: string;
    };
    updates: {
      updateNow: string;
      noUpdates: string;
      checkForUpdates: string;
      lastUpdateCheck: string;
      updateAvailable: string;
      ourUpdatesWebPage: string;
      openUpdatesWebPage: string;
      updateAvailableMessage: string;
    };
    permissions: {
      overlayPermission: string;
      noCameraPermission: string;
      locationPermission: string;
      autoStartPermission: string;
      needsCameraPermission: string;
      doNotDisturbPermission: string;
      overlayPermissionMessage: string;
      locationPermissionMessage: string;
      autoStartPermissionMessage: string;
      requestingCameraPermission: string;
      batteryOptimizationPermission: string;
      doNotDisturbPermissionMessage: string;
      batteryOptimizationPermissionMessage: string;
    };
    times: {
      millis: string;
      seconds: string;
      minutes: string;
      hours: string;
    };
    labels: {
      sync: string;
      play: string;
      stop: string;
      copy: string;
      undo: string;
      later: string;
      retry: string;
      pause: string;
      accept: string;
      paused: string;
      remove: string;
      restore: string;
      playing: string;
      dismiss: string;
      toggle: string;
      doNotAskAgain: string;
      fileSavedSuccessTitle: string;
      fileSavedSuccessMessage: `${string}{{filename}}${string}{{filePath}}${string}`;
      fileNotSavedErrorTitle: string;
      fileNotSavedErrorMessage: `${string}{{filename}}${string}{{filePath}}${string}`;
      noDirectorySelected: string;
      continue: string;
      cancel: string;
      save: string;
      mode: string;
      fileInfo: string;
      deselect: string;
      clipboard: string;
      search: string;
    };
    notes: {
      keyWords: string;
      description: string;
      title: string;
      listTab: string;
      viewerTab: string;
      settingsTab: string;
      useVaultPassword: string;
      syncEnabled: string;
      syncHint: string;
      allFolder: string;
      allShort: string;
      unlockHint: string;
      emptyNotes: string;
      hide: string;
      pin: string;
      moveTo: string;
      createFolderTitle: string;
      create: string;
      unlockTitle: string;
      continue: string;
      hiddenNotes: string;
      noHiddenNotes: string;
      chars: string;
      record: string;
      image: string;
      list: string;
      document: string;
      text: string;
      select: string;
      edit: string;
      openFile: string;
      folderNamePlaceholder: string;
      passwordPlaceholder: string;
      draftPlaceholder: string;
      createPasswordDescription: string;
      typePasswordDescription: string;
      moveNotesTitle: string;
      moveNotesMessage: string;
      deleteNotesTitle: string;
      deleteSelectedMessage: `${string}{{count}}${string}`;
      invalidPasswordTitle: string;
      invalidPasswordMessage: string;
      now: string;
      viewerEmpty: string;
      untitled: string;
      emptyPreview: string;
    };
    recorder: {
      keyWords: string;
      description: string;
      infiniteRecord: string;
      permissionDenied: string;
      saved: `${string}{{uri}}${string}`;
      failedToStop: `${string}{{message}}${string}`;
      failedToInitialize: `${string}{{message}}${string}`;
      label: string;
      currentTime: `${string}{{time}}${string}`;
      duration: `${string}{{duration}}${string}`;
      currentQuality: `${string}{{quality}}${string}`;
      low: string;
      lowDescription: string;
      medium: string;
      mediumDescription: string;
      high: string;
      highDescription: string;
      lossless: string;
      losslessDescription: string;
      audioQuality: string;
      stopRecording: string;
      startRecording: string;
      playSelectedRecording: string;
      dataLoaded: string;
      recordedAudios: string;
      saveAudioNumber: `${string}{{number}}${string}`;
      selectAudioNumber: `${string}{{number}}${string}`;
      deleteAudioNumber: `${string}{{number}}${string}`;
      recording: `${string}{{seconds}}${string}`;
      autoStartRecording: string;
      autoStartedNotification: string;
      autoStartedFailedNotification: string;
      autoStartedTitle: string;
      autoStartedFailedTitle: string;
      stopped: string;
      pauseSelectedRecording: string;
      typeTime: `${string}{{typeTime}}${string}`;
      intervalOfSaves: string;
      maxFilesToKeep: `${string}{{maxFiles}}${string}`;
    };
    images: {
      selectedImagesTabTitle: string;
      convertedImagesTabTitle: string;
      keyWords: string;
      description: string;
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
    cryptos: {
      title: string;
      keyWords: string;
      description: string;
      notifiInterval: string;
      notifiIntervalError: `${string}{{min}}${string}`;
      refreshIntervalError: `${string}{{min}}${string}`;
      syncingSettingsDescription: string;
      currentCurrency: `${string}{{currency}}${string}`;
      icon: string;
      display: string;
      refreshIntervalSec: string;
      selection: string;
      currentPrice: string;
      price: `${string}{{currency}}${string}: $${string}{{price}}${string}`;
      owned: `${string}{{amount}}${string} (${string}{{cryptoName}}${string})`;
      priceOfCrypto: `${string}{{cryptoName}}${string}`;
      clearCache: string;
      ownedAmount: `${string}{{amount}}${string}{{cryptoName}}${string}`;
      firstInvest: `${string}{{amount}}${string}{{cryptoName}}${string}${string}{{price}}${string}`;
      gainAmount: `${string}{{gainAmount}}${string}{{currency}}${string}`;
      datePurchased: `${string}{{date}}${string}`;
      selectCurrency: string;
      noCryptosFound: string;
      goToSelectionTab: string;
      myCryptoPortfolio: string;
      noCryptocurrenciesSelected: string;
      cryptocurrenciesTracked_one: `${string}{{count}}${string}`;
      cryptocurrenciesTracked_other: `${string}{{count}}${string}`;
    };
    loadingScreen: {
      welcomeTo: string;
    };
    auth: {
      email: string;
      checkPassword: string;
      youAreNotLoggedIn: string;
      youAreNotLoggedInMessage: string;
      qr: {
        loginWithQRExplanation: string;
        loginSuccessTitle: string;
        loginSuccessMessage: string;
        scanQRCode: string;
        loginWithEmail: string;
        loginWithQR: string;
        generatingQRCode: string;
        loggingInWithQRCode: string;
        scanQRCodeInstructions: string;
        processingQRCode: string;
        qrLoginErrorTitle: string;
        qrLoginErrorMessage: string;
      };
      errorNoSession: string;
      errorNoSessionMessage: string;
      successSignUp: string;
      successSignUpMessage: string;
      verifyEmail: string;
      incorrectPassword: string;
      loggingIn: string;
      authFailed: string;
      authFailedMessage: string;
      emailPlaceholder: string;
      passwordPlaceholder: string;
      loginButton: string;
      rememberMe: string;
      forgotPassword: string;
      createAccount: string;
      signUp: string;
      hasAccount: string;
      successLogin: string;
      successLoginMessage: string;
      authenticate: string;
      authenticateMessage: string;
      successForgotPasswordMessage: string;
    };
    games: {
      youWin: string;
      youLose: string;
      youArePlaying: string;
      title: string;
      keyWords: string;
      description: string;
      startGame: string;
      minesweeper: {
        easy: `${string}{{size}}${string}`;
        hard: `${string}{{size}}${string}`;
        title: string;
        medium: `${string}{{size}}${string}`;
        flagsRemaining: `${string}{{count}}${string}`;
      };
    };
    vault: {
      keyWords: string;
      description: string;
      title: string;
      subtitle: string;
      unlock: string;
      lock: string;
      rootNotAvailable: string;
      editFolder: string;
      newFolder: string;
      folderName: string;
      folderNameRequired: string;
      encryptionPolicy: string;
      importFiles: string;
      importFolders: string;
      compression: string;
      preview: string;
      editText: string;
      closePreview: string;
      loadingPreview: string;
      previewNotSupported: string;
      folders: string;
      items: string;
      newFolder: string;
      folderNamePlaceholder: string;
      decryptToTemp: string;
      shareDecrypted: string;
      deleteItem: string;
      cancelJob: string;
      noFolders: string;
      noItems: string;
      inProgress: `${string}{{jobId}}${string}${string}{{phase}}${string}`;
      dragAndDrop: string;
      createFolder: string;
      encryptFilesSuccessTitle: string;
      encryptFilesSuccessMessage: `${string}{{count}}${string}`;
      selectFromHere: string;
      selectedItems: `${string}{{count}}${string}`;
      makeReadonly: string;
      makeWritable: string;
      useDefaultFolder: string;
      noDefaultFolder: string;
      noPasswordAssigned: `${string}{{folderName}}${string}`;
      unsupportedPlatformAlert: string;
      encryptFilesErrorMessage: `${string}{{count}}${string}${string}{{filenames}}${string}`;
      selectFolderMessage: string;
      policy: {
        inheritMaster: string;
        perFolder: string;
      };
      backup: {
        title: string;
        description: string;
        exportBackup: string;
        exportDisabled: string;
        modeSameKey: string;
        modeReencrypt: string;
        passwordLabel: `${string}{{min}}${string}`;
        passwordTooShortReencrypt: `${string}{{min}}${string}`;
        androidExportDescription: string;
      };
      settings: {
        notSupportedPlatform: string;
        authPassword: string;
        authPasswordBiometricAndroid: string;
        autoLockSeconds: string;
        failedAttemptsLimit: string;
        cooldownSeconds: string;
        integrityCheckOnImport: string;
        integrityCheckOnAccess: string;
        compressionThresholdMb: string;
        autoCompressLargeFiles: string;
        minLengthPassword: `${string}{{min}}${string}`;
        confirmPasswordMessage: `${string}{{folderName}}${string}`;
        incognitoMode: string;
        secretMode: string;
        setAuthPasswordMessage: `${string}{{folderName}}${string}`;
        setAutoLockTime: string;
        autoLockTimeInMinutes: string;
        title: string;
      };
      import: {
        title: string;
        import: string;
        preflight: string;
        folderName: string;
        selectFiles: string;
        importButton: string;
        selectFolders: string;
        encryptFiles: string;
      };
      menu: {
        rename: string;
        delete: string;
        moveToFolder: string;
        copyToFolder: string;
        info: string;
        select: string;
        selectFromLastToHere: string;
      };
      viewer: {
        title: string;
        decrypting: string;
        lockedTitle: string;
      };
      modal: {
        deleteTitle: string;
        deleteMessage: `${string}{{name}}${string}`;
        renameMessage: string;
        enterNewName: string;
        renameConfirmTitle: string;
        renameConfirmMessage: `${string}{{oldName}}${string}{{newName}}${string}`;
        enterPasswordZipMessage: string;
        compressionSuccessMessage: `${string}{{path}}${string}`;
        deleteFolderMessage: `${string}{{folderName}}${string}`;
      };
    };
    settings: {
      apiURL: string;
      keyWords: string;
      language: string;
      setApiURL: string;
      description: string;
      setLanguage: string;
      adminSection: string;
      passwordAdminSection: string;
      toggleFetchCellularData: string;
      toggleFetchCellularDataExplanation: string;
      setNotifications: string;
      notificationInterval: string;
      allNotifications: string;
      appTheme: string;
      setWebSocketURL: string;
      webSocketURL: string;
      auto: string;
      light: string;
      dark: string;
      setTheme: string;
      notificationDetails: {
        enabled: string;
        interval: string;
        paused: string;
        pausedUntil: string;
        behavior: string;
        onlyWhenScreenOff: string;
        onlyWhenAppInBackground: string;
        onlyWhenConnectedToPower: string;
        onlyWhenNotInDoNotDisturb: string;
        onlyDuringSpecificHours: string;
        startHour: string;
        endHour: string;
        bypassDoNotDisturb: string;
        streamers: string;
        noStreamers: string;
      };
    };
    common: {
      serviceUnavailable: string;
      available: string;
      error: string;
      textAddedToDatabase: string;
      failedToAddTextToDatabase: string;
      errorOccurred: `${string}{{error}}${string}`;
      askOpenURL: `${string}{{url}}${string}`;
      openURL: string;
      loadMore: string;
      adding: string;
      noMoreData: string;
      showDeleted: string;
      visitWebsite: string;
      refreshEvery: `${string}{{humanizedText}}${string}`;
      addToDatabase: string;
      syncing: string;
      content: string;
      notAvailable: string;
      notifications: string;
      settings: string;
      confirm: string;
      yes: string;
      no: string;
      zip: string;
      backMessage: string;
      exitApp: string;
      exitAppMessage: string;
      back: string;
      logout: string;
      unzip: string;
      privacy: string;
      showAll: string;
      compress: string;
      security: string;
      decompress: string;
      autoRefresh: string;
      showSelected: string;
      NoInternetConnection: string;
      PleaseCheckInternetConnection: string;
      unknown: string;
      fileExtension: `${string}{{ext}}${string}`;
      fileType: `${string}{{type}}${string}`;
      fileName: `${string}{{name}}${string}`;
      fileSize: `${string}{{size}}${string}`;
      modifiedAt: `${string}{{time}}${string}`;
      createdAt: `${string}{{time}}${string}`;
      sending: string;
      selectFolder: string;
      welcome: string;
      welcomeAgain: string;
      close: string;
      success: string;
      easy: string;
      medium: string;
      hard: string;
      unlimited: string;
      deleteAll: string;
      restoreAll: string;
      loading: string;
      openWith: string;
      folders: string;
      items: string;
      unlock: string;
      empty: string;
      preview: string;
      edit: string;
      delete: string;
      unsupported: string;
      readonly: string;
      lock: string;
      confirmPassword: string;
      confirmPasswordMessage: string;
      share: string;
      scanQR: string;
      openMap: string;
      createQR: string;
      download: string;
      openEmail: string;
      callPhone: string;
    };
    colors: {
      selectBg: string;
      selectColor: string;
      setDefaults: string;
    };
    qr: {
      title: string;
      keyWords: string;
      description: string;
      writeData: string;
      selectImage: string;
      resetCamera: string;
      scanFromImage: string;
    };
    iPQuery: {
      title: string;
    };
    iP_API: {
      title: string;
    };
    pdf: {
      keyWords: string;
      description: string;
      open: string;
      close: string;
      lover: string;
      viewer: string;
      converter: string;
      customSize: string;
      customWidth: `${string}{{width}}${string}`;
      convertToPdf: string;
      customHeight: `${string}{{height}}${string}`;
      maxPdfSizeInMB: `${string}{{size}}${string}`;
      currentPaperSize: `${string}{{size}}${string}`;
      selectImagesToConvert: string;
      getSizeFromImageFiles: string;
      selectCurrentPaperSize: `${string}{{size}}${string}`;
    };
    clipboard: {
      enterYourTextHere: string;
      keyWords: string;
      description: string;
      contentLength: `${string}{{length}}${string}`;
      noClipboardData: string;
      clipboardEmptyDescription: string;
      addTextToClipboard: string;
      clipboardWebSocketError: string;
      settings: {
        title: string;
        enabled: string;
        maxItems: string;
        maxCharsInItem: string;
        enableClipboard: string;
      };
    };
  };

export type ServerTranslations = {
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
    unauthorized: string;
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

export type FrontendTranslations = {
  serverLogsViewer: {
    title: string;
    date: string;
    tag: string;
    clearAll: string;
    del: string;
    noLogsFound: string;
    clearSearch: string;
    loading: string;
    newLogs: string;
    occurrences: string;
    searchPlaceholder: string;
    allTags: string;
    sortChronological: string;
    sortReverseChronological: string;
    sortTagAz: string;
    sortTagZa: string;
    themeToggle: string;
    showMore: string;
    showLess: string;
  };
  common: {
    bullet: string;
    openBracket: string;
    closeBracket: string;
  };
};

export type FrontendTranslationsKeys = Paths<FrontendTranslations>;

export type AppTranslationsKeys = Paths<AppTranslations>;
export type ServerTranslationsKeys = Paths<ServerTranslations>;
