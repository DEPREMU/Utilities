import { ScreensAvailable } from "@types";
import { RootStackParamList } from "@/app/AppNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";

const TAG = "NAVIGATION";

class Navigation {
  public ref: ReturnType<
    typeof createNavigationContainerRef<RootStackParamList>
  >;

  #initialized = false;
  #initPromise: Promise<void> | null = null;

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = this._init();
    return this.#initPromise;
  };

  public getCurrentScreen = (): ScreensAvailable => {
    return this.ref.getCurrentRoute()?.name ?? "Home";
  };

  public navigate = (name: ScreensAvailable, params?: object) => {
    this.ref.navigate(...([name, params] as never));
  };

  public replace = (name: ScreensAvailable, params?: object) => {
    this.ref.reset({
      index: 0,
      routes: [{ name, params }],
    });
  };

  private _init = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    const initialize = async () => {
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
      } finally {
        this.#initialized = true;
        this.#initPromise = null;
      }
    };

    this.#initPromise = initialize();
    return this.#initPromise;
  };

  constructor() {
    this.ref = createNavigationContainerRef<RootStackParamList>();
  }
}

export const navigation = new Navigation();
