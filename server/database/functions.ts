import env from "../env.ts";
import chalk from "chalk";
import { pool } from "./postgres.ts";
import { TABLE_MAP } from "../config.ts";
import { RequestDatabaseInsert, Tables, TablesKeys, Falsy } from "@types";

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
          .join(" AND "),
        values: Object.values(data),
      };
    case "placeholders":
      return {
        query: Object.keys(data)
          .map((_, i) => `$${i + indexStart}`)
          .join(", "),
        values: Object.values(data),
      };
  }
  return {
    query: "",
    values: [],
  };
};

/**
 * Updates user data in the specified table
 */
export const updateInTable = async <T extends TablesKeys>(
  table: T = "Users" as T,
  updates: Partial<Tables[T]> | Partial<Tables[T]>[],
  match?: Partial<Tables[T]>,
): Promise<{
  data?: Tables[T][] | Tables[T] | Falsy;
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

    if (result.rows.length === 0) {
      return { error: "No record found to update" };
    }

    return {
      data: result.rows[0] as Tables[T],
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error updating user record: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
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
    console.error(chalk.red(errorMsg));
    return { success: false, error: errorMsg };
  } finally {
    client.release();
  }
};

/**
 * Fetches data from a specified table
 */
export const fetchFromTable = async <T extends TablesKeys = TablesKeys>(
  table: T,
  match: Partial<Tables[T]> = {},
): Promise<{
  data?: Tables[T][] | Tables[T] | null;
  error?: string | null;
}> => {
  const client = await pool.connect();
  try {
    const tableName = TABLE_MAP[table];

    let query = `SELECT * FROM ${tableName}`;
    const values: unknown[] = [];

    if (Object.keys(match).length > 0) {
      const whereClause = getKeysQuery(match, "where");
      query += ` WHERE ${whereClause.query}`;
      values.push(...Object.values(whereClause.values));
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return { data: null, error: null };
    }

    const data = result.rows.map((row: Record<string, unknown>) => row);

    if (data.length === 1) {
      return { data: data[0] as Tables[T], error: null };
    }

    return {
      data: data as Tables[T][],
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error fetching data from table: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
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
  data?: Tables[T][] | Tables[T] | null;
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
      return { error: "Failed to insert record" };
    }

    return {
      data: result.rows[0] as Tables[T],
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error inserting user record: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
  } finally {
    client.release();
  }
};

export const deleteSessions = async () => {
  if (!env.DELETE_OLD_SESSIONS) return;

  console.log(chalk.blue("Deleting old sessions and push tokens..."));
  try {
    const users = await fetchFromTable("Users");
    let data = users.data;
    if (!data) return;
    if (!Array.isArray(data)) data = [data];
    if (data.length === 0) return;

    const deleted = await Promise.all(
      data.map((user) => {
        if (!user.userId) return;
        return Promise.all([
          deleteInTable(user.userId, "UserSessions"),
          deleteInTable(user.userId, "PushTokens"),
        ]);
      }),
    );
    console.log(
      chalk.green("Old sessions and push tokens deleted successfully. Count:"),
      deleted.length,
    );
  } catch (error) {
    console.error(chalk.red("Error deleting old sessions:"), error);
  }
};
