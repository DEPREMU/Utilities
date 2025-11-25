import { Tables, TablesKeys } from "./database/index";

export interface SerializableTask<T extends AvailableFunctions> {
  id: string;
  functionName: T;
  args: FunctionsArguments<T>;
  timestamp: number;
}

export type AvailableFunctions =
  | "refreshSession"
  | "insertIntoDatabase"
  | "updateFromDatabase"
  | "deleteFromDatabase";

export type InsertIntoDatabaseArguments = [
  table: TablesKeys,
  values: Tables[TablesKeys] | Tables[TablesKeys][]
];

export type UpdateFromDatabaseArguments = [
  table: TablesKeys,
  values: Partial<Tables[TablesKeys]> | Partial<Tables[TablesKeys]>[],
  match: Partial<Tables[TablesKeys]> | null
];

export type DeleteFromDatabaseArguments = [
  table: TablesKeys,
  match: Partial<Tables[TablesKeys]> | null
];

export type FunctionsArguments<T extends AvailableFunctions> =
  T extends "insertIntoDatabase"
    ? InsertIntoDatabaseArguments
    : T extends "updateFromDatabase"
    ? UpdateFromDatabaseArguments
    : T extends "deleteFromDatabase"
    ? DeleteFromDatabaseArguments
    : T extends "refreshSession"
    ? []
    : never;

export type MetaInfoFunctions<
  T extends AvailableFunctions = AvailableFunctions
> = {
  id: string;
  args: FunctionsArguments<T>;
  functionName: T;
};
