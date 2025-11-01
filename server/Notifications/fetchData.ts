import chalk from "chalk";
import { fetchFromTable } from "../supabase/functions.ts";
import type { Tables, TablesKeys } from "../../types";

export const dataSupabase = {
  Logs: [] as Tables["Logs"][],
  Users: [] as Tables["Users"][],
  Cryptos: [] as Tables["Cryptos"][],
  Streamers: [] as Tables["Streamers"][],
  PushTokens: [] as Tables["PushTokens"][],
  UserConfig: [] as Tables["UserConfig"][],
  DownDetector: [] as Tables["DownDetector"][],
  UserSessions: [] as Tables["UserSessions"][],
  ClipboardSync: [] as Tables["ClipboardSync"][],
  UserNotificationsConfig: [] as Tables["UserNotificationsConfig"][],
};

const handleFetchNewData = () => {
  console.log(chalk.blue("Fetching new data from Supabase..."));

  Object.keys(dataSupabase).forEach(async (table) => {
    const fetchFromSupabase = await fetchFromTable(
      table as keyof typeof dataSupabase,
    );
    if (!fetchFromSupabase.data) return;

    const tableData = Array.isArray(fetchFromSupabase.data)
      ? fetchFromSupabase.data
      : [fetchFromSupabase.data];

    (dataSupabase as Record<TablesKeys, Tables[TablesKeys][]>)[
      table as TablesKeys
    ] = tableData;
    console.log(chalk.green(`\tFetched and updated data for table: ${table}`));
  });
};

const getInterval = () => {
  console.log(chalk.blue("Starting fetchData interval..."));

  return setInterval(handleFetchNewData, 10 * 60 * 1000);
};

setInterval(() => {
  dataSupabase.Logs = [
    {
      id: crypto.randomUUID(),
      message: "Heartbeat log",
      timestamp: new Date().toISOString(),
      deviceId: "system",
      deviceName: "system",
      type: "log",
      userId: "system",
    },
  ];
}, 4000);

setTimeout(handleFetchNewData, 2000);

export default getInterval();
