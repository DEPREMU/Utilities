import { REPLACERS } from "@common";

if (REPLACERS.isProduction) {
  import("./streamers.ts");
  import("./downDetector.ts");
  import("./serverRestart.ts");
}
