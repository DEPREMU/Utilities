import { Tables, TablesKeys } from "./database/index";

export interface SerializableTask<T extends AvailableFunctions> {
  id: string;
  functionName: T;
  args: FunctionsArguments<T>;
  timestamp: number;
}

export type AvailableFunctions =
  | "refreshSession"
  | "deleteFromDatabase"
  | "insertIntoDatabase"
  | "updateFromDatabase";

export type InsertIntoDatabaseArguments<T extends TablesKeys> = [
  table: T,
  values: Tables[T] | Tables[T][],
];

export type UpdateFromDatabaseArguments<T extends TablesKeys> = [
  table: T,
  match: Partial<Tables[T]> | null,
  values: Partial<Tables[T]> | Partial<Tables[T]>[],
];

export type DeleteFromDatabaseArguments<T extends TablesKeys> = [
  table: T,
  match: Partial<Tables[T]> | null,
];

export type FunctionsArguments<
  T extends AvailableFunctions,
  U extends TablesKeys,
> = T extends "insertIntoDatabase"
  ? InsertIntoDatabaseArguments<U>
  : T extends "updateFromDatabase"
    ? UpdateFromDatabaseArguments<U>
    : T extends "deleteFromDatabase"
      ? DeleteFromDatabaseArguments<U>
      : T extends "refreshSession"
        ? []
        : never;

export type MetaInfoFunctions<
  T extends AvailableFunctions = AvailableFunctions,
> = {
  id: string;
  args: FunctionsArguments<T>;
  functionName: T;
};
