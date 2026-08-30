import { STATUS_RESPONSE } from "@commonSrc/both";
import { ThirdPartyStateManager } from "@commonSrc/serverOrElectron/ThirdPartyStateManager/index.ts";
import type { Request, Response, NextFunction } from "express";
import type { AvailableServices, ResponseUnavailableService } from "@types";

export const requireDependency = (serviceName: AvailableServices) => {
  return (_: Request, res: Response, next: NextFunction): void => {
    if (!ThirdPartyStateManager.isAvailable(serviceName)) {
      res.status(STATUS_RESPONSE.SERVICE_UNAVAILABLE).json({
        error: "Service Unavailable",
        message: `The required third-party service ${serviceName} is currently unavailable and no fallback data is present.`,
        dependency: serviceName,
      } satisfies ResponseUnavailableService);
      return;
    }
    next();
  };
};
