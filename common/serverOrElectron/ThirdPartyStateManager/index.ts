import type { AvailableServices, ThirdPartyDependency } from "@types";

class ThirdPartyStateManagerClass {
  #state = new Map<AvailableServices, ThirdPartyDependency>();

  public setUnavailable(
    serviceName: AvailableServices,
    hasFallbackData: boolean = false,
  ): void {
    this.#state.set(serviceName, {
      serviceName,
      status: "UNAVAILABLE",
      hasFallbackData,
      lastUpdated: Date.now(),
    });
  }

  public setAvailable(serviceName: AvailableServices): void {
    this.#state.set(serviceName, {
      serviceName,
      status: "AVAILABLE",
      hasFallbackData: true,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Returns true if the service is available, or if it is unavailable but has fallback data.
   * Returns false if the service is unavailable and there is no fallback data.
   */
  public isAvailable(serviceName: AvailableServices): boolean {
    const dependency = this.#state.get(serviceName);
    if (!dependency) return true;

    return dependency.status === "AVAILABLE" || dependency.hasFallbackData;
  }
}

export const ThirdPartyStateManager = new ThirdPartyStateManagerClass();
