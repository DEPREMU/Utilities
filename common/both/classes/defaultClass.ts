import { EventHandler, EventsHandler } from "./events.ts";

/**
 * Base class for services that require initialization and event handling.
 * It manages the initialization state and provides a mechanism to wait for initialization to complete.
 * Services extending this class should implement the _init method, which will be called during construction and re-initialization.
 * The class also provides a destroy method to clean up resources (including event listeners) and reset the initialization state.
 * See also: EventHandler for event management capabilities [EventHandler](./events.ts).
 */
export abstract class ServiceClass<
  T extends EventsHandler,
> extends EventHandler<T> {
  #isInitialized: boolean = false;
  #initPromise: Promise<void> | null = null;

  public get isInitialized() {
    return this.#isInitialized;
  }

  async #init() {
    try {
      await this._init();
    } finally {
      this.#isInitialized = true;
      this.#initPromise = null;
    }
  }

  public waitUntilInitialized(): Promise<void> {
    if (this.#isInitialized) return Promise.resolve();

    if (!this.#initPromise) this.#initPromise = this.#init();
    return this.#initPromise;
  }

  public clearInit() {
    this.#isInitialized = false;
    this.#initPromise = null;
  }

  override destroy() {
    super.destroy();
    this.clearInit();
  }

  _reInit() {
    this.clearInit();

    return this.waitUntilInitialized();
  }

  abstract _init(): Promise<void>;

  constructor() {
    super();
  }
}
