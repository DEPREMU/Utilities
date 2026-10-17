import { REPLACERS } from "@common";

if (REPLACERS.isProduction) {
  import("./streamers");
  import("./downDetector");
  import("./serverRestart");
}
