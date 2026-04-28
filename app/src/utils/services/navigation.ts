import { ServiceClass } from "@common";
import { ScreensAvailable } from "@types";
import { RootStackParamList } from "@/app/AppNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";

type ListenersNavigation = {
  screenChange: (screen: ScreensAvailable) => void;
};

const TAG = "NAVIGATION";

class Navigation extends ServiceClass<ListenersNavigation> {
  public ref: ReturnType<
    typeof createNavigationContainerRef<RootStackParamList>
  >;

  public getCurrentScreen = (): ScreensAvailable => {
    return this.ref.getCurrentRoute()?.name ?? "Home";
  };

  #emitScreenChange = (name: ScreensAvailable) => {
    const currentScreen = this.getCurrentScreen();
    if (currentScreen === name) return;
    this.emit("screenChange", name);
  };

  public navigate = (name: ScreensAvailable, params?: object) => {
    this.#emitScreenChange(name);
    this.ref.navigate(...([name, params] as never));
  };

  public replace = (name: ScreensAvailable, params?: object) => {
    this.#emitScreenChange(name);
    this.ref.reset({
      index: 0,
      routes: [{ name, params }],
    });
  };

  override async _init(): Promise<void> {
    const { waitForTime, logger } = await import("@utils");

    try {
      if (this.ref.isReady()) return;

      let attempts = 0;
      while (!this.ref.isReady() && attempts <= 100) {
        attempts++;
        await waitForTime(50 + attempts);
      }
    } catch (error) {
      logger.error(
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
    this.ref = createNavigationContainerRef<RootStackParamList>();
    this._reInit();
  }
}

export const navigation = new Navigation();
