import { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { ChannelsIpcRenderer } from "@types";

export type IpcHandlerEntry<
  K extends keyof ChannelsIpcRenderer = keyof ChannelsIpcRenderer,
> = ChannelsIpcRenderer[K]["typeIpc"] extends "send"
  ? {
      type: "on";
      func: (
        event: IpcMainEvent,
        ...args: ChannelsIpcRenderer[K]["functionArgs"]
      ) => ChannelsIpcRenderer[K]["functionReturn"];
    }
  : {
      type: "handle";
      func: (
        event: IpcMainInvokeEvent,
        ...args: ChannelsIpcRenderer[K]["functionArgs"]
      ) => ChannelsIpcRenderer[K]["functionReturn"];
    };

export type IpcHandlersRecord<
  K extends keyof ChannelsIpcRenderer = keyof ChannelsIpcRenderer,
> = {
  [P in K]: IpcHandlerEntry<P>;
};
