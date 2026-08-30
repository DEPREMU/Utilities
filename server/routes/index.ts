import "../Notifications";

import { Router } from "express";
import { ROUTER_AUTH } from "./auth/";
import { ROUTER_LOGS } from "./logs";
import { ROUTER_INFO } from "./info";
import { ROUTER_ADMIN } from "./admin";
import { ROUTER_IMAGES } from "@commonSrc/serverOrElectron/express/images";
import { ROUTER_CRYPTOS } from "./cryptos";
import { ROUTER_UPDATES } from "./updates";
import { ROUTER_STREAMERS } from "./streamers";
import { ROUTER_LANGUAGES } from "./languages";
import { ROUTER_CLIPBOARD } from "./clipboard";
import { ROUTER_ENCRYPTION } from "./encryption";
import { ROUTER_USER_CONFIG } from "./userconfig";
import { ROUTER_DOWN_DETECTOR } from "./downdetector";
import { getMainRouter, REPLACERS } from "@common";
import { ROUTER_USER_NOTIFICATIONS_CONFIG } from "./usernotificationsconfig";

const router = getMainRouter({
  "/dev": {
    router: REPLACERS.isDev
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require("./dev/index.ts") as typeof import("./dev/index.ts"))
          .ROUTER_DEV
      : Router(),
  },

  "/auth": { router: ROUTER_AUTH },
  "/info": { router: ROUTER_INFO },
  "/logs": { router: ROUTER_LOGS },
  "/admin": { router: ROUTER_ADMIN },
  "/images": { router: ROUTER_IMAGES },
  "/cryptos": { router: ROUTER_CRYPTOS },
  "/updates": { router: ROUTER_UPDATES },
  "/languages": { router: ROUTER_LANGUAGES },
  "/streamers": { router: ROUTER_STREAMERS },
  "/clipboard": { router: ROUTER_CLIPBOARD },
  "/encryption": { router: ROUTER_ENCRYPTION },
  "/user-config": { router: ROUTER_USER_CONFIG },
  "/down-detector": { router: ROUTER_DOWN_DETECTOR },
  "/user-notifications-config": { router: ROUTER_USER_NOTIFICATIONS_CONFIG },
});

export default router;
