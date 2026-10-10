import { ipcRenderer } from "electron";
import { ChannelsIpcRenderer } from "@types";
import { ALL_KEYS_STORAGE_TYPE } from "@common";

export const sendMessage = async <
  T extends ALL_KEYS_STORAGE_TYPE = ALL_KEYS_STORAGE_TYPE,
  K extends keyof ChannelsIpcRenderer<T> = keyof ChannelsIpcRenderer<T>,
  V extends ChannelsIpcRenderer<T>[K]["functionArgs"] =
    ChannelsIpcRenderer<T>[K]["functionArgs"],
>(
  type: ChannelsIpcRenderer<T>[K]["typeIpc"],
  channel: K,
  ...args: V
): Promise<ChannelsIpcRenderer<T>[K]["functionReturn"]> => {
  if (type === "invoke") {
    return (await ipcRenderer?.invoke(
      channel as string,
      ...args,
    )) as ChannelsIpcRenderer<T>[K]["functionReturn"];
  }

  ipcRenderer?.send(channel as string, ...args);
  return undefined as ChannelsIpcRenderer<T>[K]["functionReturn"];
};
