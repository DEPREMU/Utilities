import chalk from "chalk";
import { dbInitialized } from "../database/postgres.ts";
import { fetchFromTable } from "../database/functions.ts";
import { Tables, TablesKeys } from "@types";
import { showError, showInfo } from "../functions/logger.ts";

export const dataDatabase: {
  [key in TablesKeys]: Tables[key][];
} = {
  Logs: [],
  Notes: [],
  Users: [],
  Cryptos: [],
  Streamers: [],
  PushTokens: [],
  UserConfig: [],
  DownDetector: [],
  UserSessions: [],
  ClipboardSync: [],
  UserNotificationsConfig: [],
};

const TablesNot: TablesKeys[] = [
  "Logs",
  "Users",
  "UserSessions",
  "ClipboardSync",
];

const handleFetchNewData = () => {
  if (!dbInitialized) return;
  showInfo(chalk.blue("Fetching new data from Database..."));

  Object.keys(dataDatabase).forEach(async (table) => {
    try {
      const tableType = table as TablesKeys;

      if (TablesNot.includes(tableType)) return;
      const fetchFromDatabase = await fetchFromTable({ table: tableType });
      dataDatabase[tableType] = [];
      if (!fetchFromDatabase.data) return;

      const tableData = Array.isArray(fetchFromDatabase.data)
        ? fetchFromDatabase.data
        : [fetchFromDatabase.data];

      (dataDatabase as Record<TablesKeys, Tables[TablesKeys][]>)[tableType] =
        tableData;
      showInfo(chalk.green(`\tFetched and updated data for table: ${table}`));
    } catch (error) {
      showError(`Error fetching data for table ${table}:`, error);
    }
  });
};

const getInterval = () => {
  showInfo(chalk.blue("Starting fetchData interval..."));

  return setInterval(handleFetchNewData, 60 * 1000);
};

setTimeout(handleFetchNewData, 5000);

export default getInterval();
