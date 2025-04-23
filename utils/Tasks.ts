import * as TaskManager from "expo-task-manager";
import { notis } from "./globalVariables/constants";
import { notificationsIPData, notificationsStreamers } from "./Notifications";
import { BackgroundFetchResult } from "expo-background-fetch";

export const defineBackgroundFetchTask = () => {
  TaskManager.getRegisteredTasksAsync().then((tasks) => {
    const newNotis = notis.filter((noti) => {
      const isTask = tasks.find(
        (task) => task.taskName === `NOTIFICATIONS_${noti}`
      );

      return !isTask;
    });

    try {
      newNotis.forEach((noti) => {
        const taskName = `NOTIFICATIONS_${noti}`;

        TaskManager.defineTask(taskName, async () => {
          try {
            switch (noti) {
              case "streamers":
                await notificationsStreamers();
                break;
              case "ipData":
                await notificationsIPData();
                break;
              //! Add more
              default:
                break;
            }
            return BackgroundFetchResult.NewData;
          } catch (error) {
            return BackgroundFetchResult.Failed;
          }
        });
      });
    } catch (error) {}
  });
};
