import { tTyped } from "@/utils/translates";
import { AndroidAction } from "react-native-notify-kit";

export class Actions {
  static ORDER = [
    "dismiss",
    "pause",
    "stop",
    "updateNow",
    "installViaApp",
  ] as const satisfies (keyof typeof Actions.Actions)[];

  static Actions = {
    stop: () => ({
      icon: "stop",
      title: tTyped("labels.stop"),
      pressAction: { id: "stop" },
    }),
    updateNow: () => ({
      title: tTyped("updates.updateNow"),
      pressAction: { id: "updateNow" },
    }),
    pause: () => ({
      icon: "pause",
      title: tTyped("labels.pause"),
      input: { placeholder: tTyped("times.minutes") },
      pressAction: { id: "pause" },
    }),
    dismiss: () => ({
      icon: "delete",
      title: tTyped("labels.dismiss"),
      pressAction: { id: "dismiss" },
    }),
    installViaApp: () => ({
      title: tTyped("updates.installViaApp"),
      pressAction: { id: "installViaApp" },
    }),
  } satisfies Record<string, () => AndroidAction>;

  static getActions(
    actions: (keyof typeof Actions.Actions)[],
  ): AndroidAction[] {
    const sorted = [...new Set(actions)].sort(
      (a, b) => Actions.ORDER.indexOf(a) - Actions.ORDER.indexOf(b),
    );

    return sorted.map((action) => Actions.Actions[action]());
  }
}
