import {
  logger,
  getSumVersion,
  sanitizeFileName,
  getImageFromVideo,
  getMimeTypeFromExtension,
} from "@utils";
import * as ExpoSQL from "expo-sqlite";
import { FolderFiles } from "@types";

const TAG = "VaultService";
const DB_NAME = "vault.db";
const DB_VERSION = "1.0.0";
const META_TABLE_NAME = "meta";
const MAIN_TABLE_NAME = "encrypted_files";

const TABLES = {
  Meta: {
    name: META_TABLE_NAME,
    create: `CREATE TABLE IF NOT EXISTS ${META_TABLE_NAME} (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
  )`,
    default: {
      key: "version",
      value: DB_VERSION,
    },
  },
  EncryptedFiles: {
    name: MAIN_TABLE_NAME,
    create: `CREATE TABLE IF NOT EXISTS ${MAIN_TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      folderId TEXT NOT NULL,
      video TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    default: {
      id: 0,
      uri: "",
      video: null as string | null,
      folderId: "",
      created_at: "",
    },
  },
} as const;

export type Tables = {
  Meta: typeof TABLES.Meta.default;
  EncryptedFiles: typeof TABLES.EncryptedFiles.default;
};

type SaveEncFileOptions = {
  isVideo?: boolean;
  previewSourceUri?: string;
};

type DeleteByUriResult = {
  success: boolean;
  deletedRow: Tables["EncryptedFiles"] | null;
};

type DeleteByFolderIdResult = {
  success: boolean;
  deletedRows: Tables["EncryptedFiles"][];
};

const insert = (
  table: keyof typeof TABLES,
  obj: Record<string, unknown>,
): {
  str: string;
  args: never[];
} => {
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => "?").join(", ");
  const tableName = TABLES[table].name;

  const str = `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
  const args = Object.values(obj) as string[];

  return { str, args } as never;
};

const select = (
  table: keyof typeof TABLES,
  options: {
    count?: "*" | number;
    whereClause?: string;
  },
): string => {
  const tableName = TABLES[table].name;

  return `SELECT ${options.count || "*"} FROM ${tableName} ${options.whereClause ? `WHERE ${options.whereClause}` : ""}`;
};

type WhereClause = Record<string, unknown> | string;

const getWhereClouse = (whereClause: WhereClause) => {
  let whereStr = "";
  if (typeof whereClause === "string") {
    whereStr = whereClause;
  } else {
    whereStr = Object.keys(whereClause)
      .map((key) => `${key} = ?`)
      .join(" AND ");
  }

  return whereStr;
};

const update = (
  table: keyof typeof TABLES,
  updates: Record<string, unknown>,
  whereClause: WhereClause,
): {
  str: string;
  args: never[];
} => {
  const setClause = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ");
  const tableName = TABLES[table].name;

  const str = `UPDATE ${tableName} SET ${setClause} WHERE ${getWhereClouse(whereClause)}`;
  const args = Object.values(updates) as string[];

  return { str, args } as never;
};

const deleteFrom = (
  table: keyof typeof TABLES,
  whereClause: WhereClause,
): {
  str: string;
  args: never[];
} => {
  const tableName = TABLES[table].name;

  const str = `DELETE FROM ${tableName} ${whereClause ? `WHERE ${getWhereClouse(whereClause)}` : ""}`;
  const args = Object.values(whereClause || {}) as string[];

  return { str, args } as never;
};

class VaultService {
  #initPromise: Promise<void> | null;
  #initialized = false;

  #db = null as unknown as ExpoSQL.SQLiteDatabase;

  public cleanUp = async () => {
    try {
      this.#initPromise = null;
      this.#initialized = false;
      await this.#db.closeAsync();
    } catch (error) {
      logger.error(
        TAG,
        "Failed to clean up database:",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  #getDisplayNameFromEncryptedUri = (uri: string) => {
    const noQuery = uri.split("?")[0] || "";
    const noProtocol = noQuery.replace(/^file:\/\//, "");
    const rawName = decodeURIComponent(noProtocol.split("/").pop() || "");
    const nameWithoutEnc = rawName.replace(/\.enc$/i, "");
    return sanitizeFileName(nameWithoutEnc || rawName || "unknown");
  };

  public mapRowsToFolderFiles = (
    rows: Tables["EncryptedFiles"][],
  ): FolderFiles => {
    return rows.map((row) => {
      const name = this.#getDisplayNameFromEncryptedUri(row.uri);
      const extension = name.includes(".") ? name.split(".").pop() || "" : "";

      return {
        uri: row.uri,
        originalUri: row.uri,
        name,
        size: null,
        mimeType: getMimeTypeFromExtension(extension),
        previewUri: row.video,
        decrypting: true,
      };
    });
  };

  #migrateDB = async (tx: ExpoSQL.SQLiteDatabase) => {
    const data = await tx.getAllAsync<Tables["EncryptedFiles"]>(
      `SELECT * FROM ${MAIN_TABLE_NAME}`,
    );
    await tx.execAsync(`DROP TABLE IF EXISTS ${MAIN_TABLE_NAME}`);
    await tx.execAsync(TABLES.EncryptedFiles.create);
    const insertPromises = data.map((row) => {
      const { str, args } = insert("EncryptedFiles", {
        ...TABLES.EncryptedFiles.default,
        ...row,
      });

      tx.runAsync(str, args);
    });
    await Promise.all(insertPromises);

    const { str, args } = update(
      "Meta",
      { value: DB_VERSION },
      { key: "version" },
    );

    await tx.runAsync(str, args);
  };

  private _initDB = async () => {
    try {
      await this.#db.withExclusiveTransactionAsync(async (tx) => {
        await Promise.all(
          Object.values(TABLES).map((table) => tx.execAsync(table.create)),
        );

        const versionRow = await tx.getFirstAsync<Tables["Meta"]>(
          `SELECT value FROM ${META_TABLE_NAME} WHERE key = ?`,
          ["version"],
        );
        if (!versionRow) {
          const { str, args } = insert("Meta", {
            key: "version",
            value: DB_VERSION,
          });
          await tx.runAsync(str, args);
          return;
        } else if (versionRow.value === DB_VERSION) return;

        const targetVersion = getSumVersion(DB_VERSION);
        const currentVersion = getSumVersion(versionRow.value);
        if (targetVersion > currentVersion) {
          await this.#migrateDB(tx);
        }
      });
    } catch (e) {
      logger.error(
        TAG,
        "Failed to initialize database schema",
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  private _init = async () => {
    try {
      if (this.#initialized && this.#db) return;

      this.#db = await ExpoSQL.openDatabaseAsync(DB_NAME);
      await this._initDB();
    } catch (e) {
      logger.error(
        TAG,
        "Failed to initialize VaultService",
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      this.#initialized = true;
      this.#initPromise = null;
    }
  };

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = this._init();
    return this.#initPromise;
  };

  public saveEncFile = async (
    folderName: string,
    encryptedFileUri: string,
    options?: SaveEncFileOptions,
  ) => {
    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      let videoUri: string | null = null;
      if (options?.isVideo) {
        const uriToGeneratePreview =
          options.previewSourceUri || encryptedFileUri || "";
        if (uriToGeneratePreview) {
          videoUri = await getImageFromVideo(uriToGeneratePreview);
        }
      }

      const { str, args } = insert("EncryptedFiles", {
        uri: encryptedFileUri,
        video: videoUri,
        folderId: folderName,
      });
      const res = await db.runAsync(str, args);

      return res;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to save encrypted file:",
        encryptedFileUri,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  };

  public getEncFilesByFolderId = async (folderId: string) => {
    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      const query = select("EncryptedFiles", {
        whereClause: "folderId = ?",
      });
      const rows = await db.getAllAsync<Tables["EncryptedFiles"]>(
        query,
        folderId,
      );
      return rows;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to get encrypted files for folder:",
        folderId,
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  };

  public getFolderFilesFromDB = async (
    folderId: string,
  ): Promise<FolderFiles> => {
    const rows = await this.getEncFilesByFolderId(folderId);
    return this.mapRowsToFolderFiles(rows);
  };

  public deleteByUri = async (uri: string): Promise<DeleteByUriResult> => {
    const res: DeleteByUriResult = { success: false, deletedRow: null };

    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      const row =
        (await db.getFirstAsync<Tables["EncryptedFiles"]>(
          `SELECT * FROM ${MAIN_TABLE_NAME} WHERE uri = ? LIMIT 1`,
          [uri],
        )) || null;
      res.deletedRow = row;

      const { str, args } = deleteFrom("EncryptedFiles", { uri });
      const result = await db.runAsync(str, args);

      res.success = result.changes > 0;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to delete encrypted file with uri:",
        uri,
        error instanceof Error ? error.message : String(error),
      );
    }

    return res;
  };

  public deleteByFolderId = async (
    folderId: string,
  ): Promise<DeleteByFolderIdResult> => {
    const res: DeleteByFolderIdResult = {
      success: false,
      deletedRows: [],
    };

    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      const rows = await db.getAllAsync<Tables["EncryptedFiles"]>(
        `SELECT * FROM ${MAIN_TABLE_NAME} WHERE folderId = ?`,
        [folderId],
      );
      res.deletedRows = rows;

      const { str, args } = deleteFrom("EncryptedFiles", { folderId });
      const result = await db.runAsync(str, args);

      res.success = result.changes >= 0;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to delete encrypted files in folder:",
        folderId,
        error instanceof Error ? error.message : String(error),
      );
    }

    return res;
  };

  public renameFolderId = async (
    previousFolderId: string,
    newFolderId: string,
  ): Promise<{ success: boolean; changes: number }> => {
    const result = { success: false, changes: 0 };

    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      const updateRes = await db.runAsync(
        `UPDATE ${MAIN_TABLE_NAME} SET folderId = ? WHERE folderId = ?`,
        [newFolderId, previousFolderId],
      );

      result.success = true;
      result.changes = updateRes.changes;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to rename folder in db:",
        previousFolderId,
        newFolderId,
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  };

  public moveEncFile = async (
    previousUri: string,
    nextUri: string,
    folderId: string,
  ): Promise<{ success: boolean }> => {
    const result = { success: false };

    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      await db.runAsync(
        `UPDATE ${MAIN_TABLE_NAME} SET uri = ?, folderId = ? WHERE uri = ?`,
        [nextUri, folderId, previousUri],
      );
      result.success = true;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to move encrypted file:",
        previousUri,
        nextUri,
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  };

  public renameEncFile = async (
    previousUri: string,
    nextUri: string,
  ): Promise<{ success: boolean }> => {
    const result = { success: false };

    try {
      await this.waitUntilLoaded();
      const db = this.#db;

      await db.runAsync(`UPDATE ${MAIN_TABLE_NAME} SET uri = ? WHERE uri = ?`, [
        nextUri,
        previousUri,
      ]);
      result.success = true;
    } catch (error) {
      logger.error(
        TAG,
        "Failed to rename encrypted file:",
        previousUri,
        nextUri,
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  };

  constructor() {
    this.#initPromise = this._init();
  }
}

class VaultServiceManager {
  #service: VaultService | null = null;
  #timeoutId: number | null = null;

  public getService = () => {
    if (!this.#service) {
      this.#service = new VaultService();
    }
    if (this.#timeoutId) {
      import("@utils").then(({ clearTimeoutPolyfill }) => {
        clearTimeoutPolyfill(this.#timeoutId);
        this.#timeoutId = null;
      });
    }
    return this.#service;
  };

  public cleanUp = async (afterTimeout?: () => Promise<void> | void) => {
    if (this.#timeoutId !== null) return;

    const { setTimeoutPolyfill } = await import("@utils");
    this.#timeoutId = setTimeoutPolyfill(
      async () => {
        await afterTimeout?.();
        this.#timeoutId = null;
        if (this.#service) {
          await this.#service.cleanUp();
          this.#service = null;
        }
      },
      5 * 60 * 1000,
    );
  };
}

export const vaultServiceManager = new VaultServiceManager();
