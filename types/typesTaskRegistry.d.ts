import { Tables, TablesKeys } from "./database/index";

export interface SerializableTask {
  id: string;
  functionName: AvailableFunctions;
  args: unknown[];
  timestamp: number;
}

export type AvailableFunctions =
  | "insertIntoDatabase"
  | "updateFromDatabase"
  | "deleteFromDatabase";

export type FunctionsArguments<T extends AvailableFunctions> =
  T extends "insertIntoDatabase"
    ? [table: TablesKeys, values: Tables[TablesKeys] | Tables[TablesKeys][]]
    : T extends "updateFromDatabase"
    ? [
        table: TablesKeys,
        values: Partial<Tables[TablesKeys]> | Partial<Tables[TablesKeys]>[],
        match: Partial<Tables[TablesKeys]> | null
      ]
    : T extends "deleteFromDatabase"
    ? [table: TablesKeys, match: Partial<Tables[TablesKeys]> | null]
    : never;
