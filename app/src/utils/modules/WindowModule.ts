import { REPLACERS } from "@common";
import { ContextBridgeType } from "@types";

const windowModule: ContextBridgeType["UtilitiesForPC"] = !REPLACERS.isWeb
  ? (null as never)
  : (window as unknown as ContextBridgeType).UtilitiesForPC;

export { windowModule };
