import { JWT } from "@/routes/auth/variables";
import { getHandlerGet, Logger } from "@common";

export const handleAuthMiddleware = getHandlerGet(
  "/clipboard",
  "/:deviceId",
  { deviceId: "string" },
  async (body, _, { req, next }) => {
    try {
      const [_, token] = req.headers.authorization?.split(" ") ?? [];

      if (!token) throw new Error("No token provided");

      const jwt = new JWT({ token });

      const data = jwt.data;

      if (!data) throw new Error("Invalid token");

      if (data.deviceId !== body.deviceId)
        throw new Error("Device ID does not match");

      next();
    } catch (error) {
      Logger.error("Error in auth middleware", error);
    }
  },
);
