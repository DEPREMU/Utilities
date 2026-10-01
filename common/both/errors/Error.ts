import { Helper } from "../helpers";
import { ErrorResponse } from "@types";
import { STATUS_RESPONSE } from "../fetch";

export class ServerError {
  static requestError(message: ErrorResponse["error"]): ErrorResponse {
    return {
      error: message,
      timestamp: Date.now(),
    };
  }

  static getMessage(res: ErrorResponse, joinString: string = " "): string {
    if (typeof res.error === "object") {
      let msg = "\n";

      if (
        "properties" in res.error &&
        typeof res.error.properties === "object" &&
        !Array.isArray(res.error.properties) &&
        res.error.properties !== null
      ) {
        msg += Helper.Object.entries(
          res.error.properties as Record<string, typeof res.error>,
        )
          .map(
            ([k, v]) =>
              `${k.toUpperCase() + ": "}` +
              ServerError.getMessage(
                { error: v, timestamp: Date.now() },
                joinString,
              ),
          )
          .join(joinString);
      }
      if (res.error.errors.length > 0) {
        msg += res.error.errors.join(joinString);
      }

      return msg;
    }

    return res.error || "An error occurred while processing the request.";
  }
}

export class RequestError extends Error {
  body: ErrorResponse;
  statusCode: STATUS_RESPONSE;

  constructor(statusCode: STATUS_RESPONSE, error: ErrorResponse["error"]) {
    const body = ServerError.requestError(error);
    super(ServerError.getMessage(body));

    this.body = body;
    this.statusCode = statusCode;
  }
}
