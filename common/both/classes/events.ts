import { EventEmitterService } from "@types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventsHandler = Record<string, (...args: any[]) => any>;

/**
 * A simple event handler class that allows adding and removing event listeners, as well as emitting events. It is designed to be extended by other classes that want to implement event handling functionality.
 * The class maintains a private map of event listeners, where each key is an event name and the value is a set of callback functions associated with that event. The `addEventListener` method allows adding a listener for a specific event, returning an object with a `remove` method to easily remove that listener. The `removeEventListeners` method can be used to remove all listeners for a specific event. The `emit` method triggers all listeners associated with a given event, passing any provided arguments to the callbacks. Finally, the `destroy` method clears all listeners from the handler.
 * This class can be used as a base for more complex event handling systems, allowing for easy management of event listeners and emissions in a structured way.
 * See also: ServiceClass for services that require initialization and event handling capabilities [ServiceClass](./defaultClass.ts).
 */
export class EventHandler<Events extends EventsHandler> {
  #listeners: {
    [K in keyof Events]?: Set<Events[K]>;
  } = {};

  public addEventListener<K extends keyof Events>(
    event: K,
    callback: Events[K],
  ): EventEmitterService {
    const listeners =
      this.#listeners[event] ?? (this.#listeners[event] = new Set());

    listeners.add(callback);

    const remove = () => {
      listeners.delete(callback);
      if (listeners.size === 0) delete this.#listeners[event];
    };

    return { remove };
  }

  public removeEventListeners<K extends keyof Events>(event?: K) {
    if (event) delete this.#listeners[event];
    else this.#listeners = {};
  }

  protected emit<K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) {
    const listeners = this.#listeners[event];
    if (!listeners) return;

    listeners.forEach((callback) => {
      try {
        callback(...args);
      } catch {
        // Ignore errors in listeners
      }
    });
  }

  protected destroy() {
    this.removeEventListeners();
  }
}
