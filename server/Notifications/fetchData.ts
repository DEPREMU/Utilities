import chalk from "chalk";
import { dbInitialized } from "../database/postgres.ts";
import { fetchFromTable } from "../database/functions.ts";
import { Tables, TablesKeys } from "@types";

export const dataDatabase = {
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

const TablesNot: TablesKeys[] = [
  "Logs",
  "ClipboardSync",
  "UserSessions",
  "Users",
];

const handleFetchNewData = () => {
  if (!dbInitialized) return;
  console.log(chalk.blue("Fetching new data from Database..."));

  Object.keys(dataDatabase).forEach(async (table) => {
    const tableType = table as keyof typeof dataDatabase;

    if (TablesNot.includes(tableType)) return;
    const fetchFromDatabase = await fetchFromTable(tableType);
    dataDatabase[table as TablesKeys] = [];
    if (!fetchFromDatabase.data) return;

    const tableData = Array.isArray(fetchFromDatabase.data)
      ? fetchFromDatabase.data
      : [fetchFromDatabase.data];

    (dataDatabase as Record<TablesKeys, Tables[TablesKeys][]>)[tableType] =
      tableData;
    console.log(chalk.green(`\tFetched and updated data for table: ${table}`));
  });
};

const getInterval = () => {
  console.log(chalk.blue("Starting fetchData interval..."));

  return setInterval(handleFetchNewData, 60 * 1000);
};

setTimeout(handleFetchNewData, 5000);

export default getInterval();
