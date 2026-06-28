import "../Notifications/index.ts";

import { Router } from "express";
import { REPLACERS } from "@/config.ts";
import { ROUTER_AUTH } from "./auth/";
import { ROUTER_LOGS } from "./logs/index.ts";
import { ROUTER_INFO } from "./info/index.ts";
import { ROUTER_CRYPTOS } from "./cryptos/";
import { ROUTER_UPDATES } from "./updates/index.ts";
import { ROUTER_STREAMERS } from "./streamers/index.ts";
import { ROUTER_LANGUAGES } from "./languages/index.ts";
import { ROUTER_ENCRYPTION } from "./encryption/index.ts";
import { ROUTER_IMAGES, getMainRouter } from "@common";

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
  "/images": { router: ROUTER_IMAGES },
  "/cryptos": { router: ROUTER_CRYPTOS },
  "/updates": { router: ROUTER_UPDATES },
  "/languages": { router: ROUTER_LANGUAGES },
  "/streamers": { router: ROUTER_STREAMERS },
  "/encryption": { router: ROUTER_ENCRYPTION },
});

export default router;
