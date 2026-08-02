import { createNavigationContainerRef } from "@react-navigation/native";
import { Timers, REPLACERS, ServiceClass } from "@common";
import { GetParamsScreen, Screens, ScreensAvailable } from "@types";

type ListenersNavigation = {
  screenChange: (screen: ScreensAvailable) => void;
};

const TAG = "NAVIGATION";

class Navigation extends ServiceClass<ListenersNavigation> {
  public static instance: Navigation;

  #currentScreen: ScreensAvailable = REPLACERS.isDev ? "Images" : "Home";

  public ref = createNavigationContainerRef<Screens>();

  public get currentScreen(): ScreensAvailable {
    return this.#currentScreen;
  }

  #emitScreenChange = (name: ScreensAvailable) => {
    if (this.#currentScreen === name) return;

    this.#currentScreen = name;
    this.emit("screenChange", name);
  };

  public navigate = <T extends ScreensAvailable>(
    name: T,
    params?: GetParamsScreen<T>,
  ) => {
    if (name === this.#currentScreen) return;

    this.#emitScreenChange(name);
    this.ref.navigate(...([name, params] as never));
  };

  public replace = <T extends ScreensAvailable>(
    name: T,
    params?: GetParamsScreen<T>,
  ) => {
    this.#emitScreenChange(name);
    this.ref.reset({
      index: 0,
      routes: [{ name, params: params as never }],
    });
  };

  override async _init(): Promise<void> {
    try {
      if (this.ref.isReady()) return;

      let attempts = 0;
      while (!this.ref.isReady() && attempts <= 100) {
        attempts++;
        await Timers.sleep(50 + attempts);
      }
    } catch (error) {
      REPLACERS.Logger.error(
        TAG,
        "Navigation initialization failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  override destroy(): void {
    super.destroy();
  }

  constructor() {
    super();
    this._reInit();

    if (Navigation.instance) return Navigation.instance;
    else return (Navigation.instance = this);
  }
}

export const navigation = new Navigation();
