import chalk from "chalk";
import { pool } from "./postgres.ts";
import { TABLE_MAP } from "../config.ts";
import { showInfo, showError } from "../functions/logger.ts";
import { RequestDatabaseInsert, Tables, TablesKeys, Falsy } from "@types";

type ArgsFetchWithoutLimit<T extends TablesKeys> = {
  table: T;
  match?: Partial<Tables[T]>;
  limit?: never;
  offset?: never;
  orderBy?: never;
  orderDirection?: never;
};

type ArgsFetchWithLimit<T extends TablesKeys> = {
  table: T;
  match?: Partial<Tables[T]>;
  limit?: number;
  offset?: number;
  orderBy: keyof Tables[T];
  orderDirection: "ASC" | "DESC";
};

type ArgsFetchSearch<T extends TablesKeys = TablesKeys> = {
  search?: string;
  columnsToSearch?: (keyof Tables[T])[];
};

type FetchFromTableFn = {
  <T extends TablesKeys>(
    args: ArgsFetchWithLimit<T> & ArgsFetchSearch<T>,
  ): Promise<{
    data: Tables[T][] | null;
    error?: string | null;
  }>;

  <T extends TablesKeys>(
    args: ArgsFetchWithoutLimit<T> & ArgsFetchSearch<T>,
  ): Promise<{
    data: Tables[T][] | null;
    error?: string | null;
  }>;
};

const getMatchObject = <T extends TablesKeys>(
  update: Partial<Tables[T]>,
  match?: { [key: string]: unknown },
) => {
  if (match && Object.keys(match).length > 0) return match;

  return Object.keys(update).includes("id")
    ? { id: update["id" as keyof Tables[TablesKeys]] }
    : { userId: update["userId" as keyof Tables[TablesKeys]] };
};

const getKeysQuery = <T extends TablesKeys>(
  data: Partial<Tables[T]>,
  is: "update" | "insert" | "where" | "placeholders",
  indexStart = 1,
): {
  query: string;
  values: unknown[];
  placeholders?: string;
} => {
  switch (is) {
    case "update":
      return {
        query: Object.keys(data)
          .map((key, i) => `"${key}"=$${i + indexStart}`)
          .join(", "),
        values: Object.values(data),
      };
    case "insert":
      return {
        query: Object.keys(data)
          .map((key) => `"${key}"`)
          .join(", "),
        values: Object.values(data),
        placeholders: Object.keys(data)
          .map((_, i) => `$${i + indexStart}`)
          .join(", "),
      };
    case "where":
      return {
        query: Object.keys(data)
          .map((key, i) => `"${key}"=$${i + indexStart}`)
          .join("\nAND "),
        values: Object.values(data),
      };
    case "placeholders":
      return {
        query: Object.keys(data)
          .map((_, i) => `$${i + indexStart}`)
          .join(", "),
        values: Object.values(data),
      };
    default:
      return {
        query: "",
        values: [],
      };
  }
};

const getQuerySearch = (
  query: string,
  values: unknown[],
  args: ArgsFetchSearch,
): [string, unknown[]] => {
  if (args.columnsToSearch && args.columnsToSearch?.length > 0) {
    if (query.includes("WHERE")) {
      const indexOfWhere = query.indexOf("WHERE");

      const where = query.slice(query.indexOf("WHERE") + 5);

      const match = where.replace(/AND/g, "").split("\n");
      const matchObj = match.reduce(
        (prev, current) => {
          current = current.trim();
          if (!current) return prev;

          const [key, value] = current.split("=").map((v) => v.trim());
          showInfo({ key, value });

          const newValue = prev;
          newValue[key.replace(/"/g, "")] = value;

          return newValue;
        },
        {} as Record<string, string>,
      );

      for (const c of args.columnsToSearch) {
        const column = String(c);
        if (!matchObj[column]) {
          matchObj[column] = `ILIKE '%' || $${
            Object.keys(matchObj).length + 1
          } || '%'`;
          values.push(args.search);
          continue;
        }

        const index = Number(matchObj[column].replace("$", "")) - 1;

        const copyValuesPart1 = values.slice(0, index);
        const copyValuesPart2 = values.slice(index + 1);

        matchObj[column] = `ILIKE '%' || $${index + 1} || '%'`;

        values = [...copyValuesPart1, args.search, ...copyValuesPart2];
      }

      const result = Object.entries(matchObj)
        .map(
          ([key, value]) =>
            `"${key}" ${value.includes("ILIKE") ? value : `= ${value}`}`,
        )
        .join("\n AND ");

      const startQuery = query.slice(0, indexOfWhere);

      query = [startQuery, "WHERE", result].join(" \n ").trim();
    } else {
      const columns = args.columnsToSearch;

      query += `WHERE ${columns
        ?.map((column) => {
          values.push(args.search);
          return `"${String(column)}" ILIKE '%' || $${values.length} || '%'`;
        })
        .join("\n AND ")}`;
    }
  }
  return [query, values];
};

/**
 * Updates user data in the specified table
 */
export const updateInTable = async <T extends TablesKeys>(
  table: T = "Users" as T,
  updates: Partial<Tables[T]> | Partial<Tables[T]>[],
  match?: Partial<Tables[T]>,
): Promise<{
  data: Tables[T][] | Falsy;
  error?: string | null;
}> => {
  const client = await pool.connect();
  try {
    const tableName = TABLE_MAP[table];

    if (Array.isArray(updates)) {
      const updatePromises = updates.map(async (update) => {
        const matchObj = getMatchObject<T>(update, match);
        const setClauses = getKeysQuery(update, "update");
        const whereClause = getKeysQuery(
          matchObj,
          "where",
          setClauses.values.length + 1,
        );

        const values = [
          ...Object.values(setClauses.values),
          ...Object.values(whereClause.values),
        ];

        const query = `UPDATE ${tableName} SET ${setClauses.query} WHERE ${whereClause.query} RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0] ? result.rows[0] : null;
      });

      const results = await Promise.all(updatePromises);
      return {
        data: results as Tables[T][],
        error: null,
      };
    }

    const matchObj = getMatchObject<T>(updates, match);
    const setClauses = getKeysQuery(updates, "update");
    const whereClause = getKeysQuery(
      matchObj,
      "where",
      setClauses.values.length + 1,
    );

    const values = [...setClauses.values, ...whereClause.values];

    const query = `UPDATE ${tableName} SET ${setClauses.query} WHERE ${whereClause.query} RETURNING *`;
    const result = await client.query(query, values);

    return {
      data: result.rows.length > 0 ? result.rows : null,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error updating user record: ${error}`;
    showError(chalk.red(errorMsg));
    return { error: errorMsg, data: null };
  } finally {
    client.release();
  }
};

/**
 * Deletes a record from a specified table
 */
export const deleteInTable = async <T extends TablesKeys = "Users">(
  userId: string,
  table: T = "Users" as T,
  match?: Partial<Tables[T]>,
): Promise<{
  success: boolean;
  error?: string | null;
}> => {
  const client = await pool.connect();
  try {
    const tableName = TABLE_MAP[table];
    const matchObj = match ?? ({ userId } as Partial<Tables[T]>);

    const whereClause = getKeysQuery(matchObj, "where");
    const values = Object.values(whereClause.values);

    const query = `DELETE FROM ${tableName} WHERE ${whereClause.query}`;
    await client.query(query, values);

    return { success: true };
  } catch (error) {
    const errorMsg = `Unexpected error deleting user record: ${error}`;
    showError(chalk.red(errorMsg));
    return { success: false, error: errorMsg };
  } finally {
    client.release();
  }
};

/**
 * Fetches data from a specified table
 */
export const fetchFromTable: FetchFromTableFn = async (args) => {
  const { table, match = {} } = args;

  const client = await pool.connect();
  try {
    const tableName = TABLE_MAP[table];

    let query = `SELECT * FROM ${tableName}\n`;
    let values: unknown[] = [];

    if (Object.keys(match).length > 0) {
      const whereClause = getKeysQuery(match, "where");
      query += ` WHERE ${whereClause.query}\n`;
      values.push(...Object.values(whereClause.values));
    }

    if ("search" in args && args.search) {
      showInfo("Query with search:", { query, values });
      [query, values] = getQuerySearch(query, values, {
        search: args.search,
        columnsToSearch: (args.columnsToSearch as []) || [],
      });
      showInfo("Query with search:", { query, values });
    }

    if ("orderBy" in args && args.orderBy) {
      query += `\n ORDER BY "${String(args.orderBy)}" ${args.orderDirection ?? "DESC"}`;
    }
    if ("limit" in args && args.limit && args.limit > 0) {
      query += `\n LIMIT $${values.length + 1}`;
      values.push(args.limit);
    }
    if ("offset" in args && args.offset && args.offset > 0) {
      query += `\n OFFSET $${values.length + 1}`;
      values.push(args.offset);
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) return { data: null, error: null };

    return { data: result.rows, error: null };
  } catch (error) {
    const errorMsg = `Unexpected error fetching data from table: ${error}`;
    showError(chalk.red(errorMsg));
    return { error: errorMsg, data: null };
  } finally {
    client.release();
  }
};

/**
 * Inserts data into a specified table
 */
export const insertIntoTable = async <T extends TablesKeys = TablesKeys>(
  table: T,
  data: RequestDatabaseInsert<T>["values"],
): Promise<{
  data: Tables[T][] | null;
  error?: string | null;
}> => {
  const client = await pool.connect();
  try {
    const tableName = TABLE_MAP[table];

    if (Array.isArray(data)) {
      const insertPromises = data.map(async (item) => {
        const data = getKeysQuery(item, "insert");
        const columns = data.query;
        const values = data.values;
        const placeholders = data.placeholders;

        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const result = await client.query(query, values);
        return result.rows[0] ? result.rows[0] : null;
      });

      const results = await Promise.all(insertPromises);
      return {
        data: results as Tables[T][],
        error: null,
      };
    }

    const dataLocal = getKeysQuery(data, "insert");
    const values = dataLocal.values;
    const columns = dataLocal.query;
    const placeholders = dataLocal.placeholders;

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return { error: "Failed to insert record", data: null };
    }

    return {
      data: result.rows,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error inserting user record: ${error}`;
    showError(chalk.red(errorMsg));
    return { error: errorMsg, data: null };
  } finally {
    client.release();
  }
};

export const deleteOldSessions = async () => {
  showInfo(chalk.blue("Deleting old sessions and push tokens..."));
  try {
    const { data } = await fetchFromTable({ table: "Users" });
    if (!data) return;
    if (!data.length) return;

    const now = Date.now();

    const deleted = await Promise.all(
      data.map(async (user) => {
        const userId = user.userId;
        if (!userId) return;

        const { data: sessions } = await fetchFromTable({
          table: "UserSessions",
          match: { userId },
        });
        if (!sessions) return;

        const oldSessions = sessions
          .map((session) => {
            try {
              const updatedAt = new Date(session.updatedAt).getTime();
              const diff = now - updatedAt;
              const daysDiff = diff / (1000 * 60 * 60 * 24);
              return daysDiff > 20 ? session : null;
            } catch {
              return session;
            }
          })
          .filter((s) => !!s);

        await Promise.all([
          ...oldSessions.map(async (s) => {
            await deleteInTable(user.userId, "UserSessions", { id: s.id });
          }),
          ...oldSessions.map(async (s) => {
            await deleteInTable(user.userId, "PushTokens", { token: s.token });
          }),
        ]);
      }),
    );
    showInfo(
      chalk.green("Old sessions and push tokens deleted successfully. Count:"),
      deleted.length,
    );
  } catch (error) {
    showError(chalk.red("Error deleting old sessions:"), error);
  }
};

type GetValidValueDB = {
  [T in TablesKeys]: (
    value: Partial<Tables[T]>,
    _?: Tables[T],
  ) => { [K in keyof Tables[T]]-?: Tables[T][K] } | null;
};

export const getValidValueDB: GetValidValueDB = {
  CryptosSettings: (value, _) => {
    if (!value.id || !value.userId || !value.createdAt) return null;

    return {
      id: value.id,
      userId: value.userId,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
      defaultCurrency: value.defaultCurrency || "USDT",
      autoRefresh: {
        enabled: value.autoRefresh?.enabled ?? true,
        valueMs: value.autoRefresh?.valueMs ?? 60000,
      },
      notifications: {
        enabled: value.notifications?.enabled ?? false,
        valueMs: value.notifications?.valueMs ?? 60000,
      },
    };
  },
  ClipboardSync: (value, _) => {
    if (
      !value ||
      !value.id ||
      !value.userId ||
      !value.deviceId ||
      !value.createdAt
    )
      return null;

    return {
      id: value.id,
      userId: value.userId,
      content: value.content || "",
      deleted: value.deleted ?? false,
      deviceId: value.deviceId,
      createdAt: value.createdAt,
    };
  },
  Cryptos: (value, _) => {
    if (
      !value.id ||
      !value.userId ||
      !value.symbol ||
      !value.baseCoin ||
      !value.quoteCoin ||
      !value.datePurchased
    )
      return null;

    return {
      id: value.id,
      amount: value.amount || "0",
      symbol: value.symbol,
      userId: value.userId,
      baseCoin: value.baseCoin,
      quoteCoin: value.quoteCoin,
      datePurchased: value.datePurchased,
      firstPricePurchased: value.firstPricePurchased ?? 0,
    };
  },
  DownDetector: (value, _) => {
    if (!value.id || !value.url || !value.userId || !value.createdAt)
      return null;

    return {
      id: value.id,
      url: value.url,
      userId: value.userId,
      createdAt: value.createdAt,
      sendNotification: value.sendNotification ?? false,
    };
  },
  Logs: (value, _) => {
    if (
      !value.id ||
      !value.type ||
      !value.userId ||
      !value.message ||
      !value.deviceId ||
      !value.timestamp ||
      !value.deviceName
    )
      return null;

    return {
      id: value.id,
      type: value.type,
      userId: value.userId,
      message: value.message,
      deviceId: value.deviceId,
      timestamp: value.timestamp,
      deviceName: value.deviceName,
    };
  },
  Notes: (value, _) => {
    if (
      !value.id ||
      !value.userId ||
      !value.createdAt ||
      (!value.title && !value.content)
    )
      return null;

    return {
      id: value.id,
      title: value.title || "",
      userId: value.userId,
      content: value.content || "",
      sources: value.sources ? value.sources : null,
      folderId: value.folderId || null,
      isPinned: value.isPinned ?? false,
      isHidden: value.isHidden ?? false,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
      richTextRuns: value.richTextRuns ? value.richTextRuns : null,
    };
  },
  PushTokens: (value, _) => {
    if (!value.id || !value.token || !value.userId || !value.createdAt)
      return null;

    return {
      id: value.id,
      token: value.token,
      userId: value.userId,
      createdAt: value.createdAt,
    };
  },
  Streamers: (value, _) => {
    if (!value.id || !value.name || !value.userId || !value.createdAt)
      return null;

    return {
      id: value.id,
      name: value.name,
      userId: value.userId,
      createdAt: value.createdAt,
      linkImage: value.linkImage || null,
    };
  },
  UserConfig: (value, _) => {
    if (!value.id || !value.userId || !value.createdAt) return null;

    return {
      id: value.id,
      theme: value.theme || "dark",
      userId: value.userId,
      API_URL: value.API_URL || "",
      language: value.language || "en",
      hasAdmin: value.hasAdmin ?? false,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
      webSocketURL: value.webSocketURL || "",
    };
  },
  UserNotificationsConfig: (value, _) => {
    if (
      !value.id ||
      !value.userId ||
      !value.reason ||
      !value.createdAt ||
      (typeof value.streamer === "string" && !value.streamer)
    )
      return null;

    return {
      id: value.id,
      reason: value.reason,
      userId: value.userId,
      paused: value.paused ?? false,
      enabled: value.enabled ?? false,
      streamer: value.streamer ?? null,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
      pauseTime: value.pauseTime ?? -1,
    };
  },
  Users: (value, _) => {
    if (!value.userId || !value.createdAt || !value.email || !value.password)
      return null;

    return {
      name: value.name || "",
      email: value.email,
      phone: value.phone || "",
      userId: value.userId,
      password: value.password,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
      description: value.description || "",
    };
  },
  UserSessions: (value, _) => {
    if (
      !value.id ||
      !value.token ||
      !value.userId ||
      !value.deviceId ||
      !value.createdAt
    )
      return null;

    return {
      id: value.id,
      token: value.token,
      userId: value.userId,
      deviceId: value.deviceId,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt ?? value.createdAt,
    };
  },
};
