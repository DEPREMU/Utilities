export type AvailableServices = "cryptos";

export type ThirdPartyDependencyStatus = "AVAILABLE" | "UNAVAILABLE";

export type ThirdPartyDependency = {
  serviceName: AvailableServices;
  status: ThirdPartyDependencyStatus;
  hasFallbackData: boolean;
  lastUpdated: number;
};
