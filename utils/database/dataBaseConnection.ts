import { supabase } from "./supabaseClient";
import { PostgrestError } from "@supabase/supabase-js";
import { verifyPassword } from "./../globalVariables/utils";
import { tableNameUsers } from "../globalVariables/constants";

const insertData = async (
  tableName: string,
  dict: object
): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase.from(tableName).insert([dict]);
    if (error) return { success: false, error: error.message };
  } catch (error) {
    return { success: false, error: `Error unexpected: ${error}` };
  }
  return { success: true, error: null };
};

export const deleteFromEq = async (
  tableName: string,
  columnEq: string,
  valueEq: string
) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq(columnEq, valueEq);

  if (error) return { succes: false, error: error };
  return { success: true, error: null };
};

export const deleteFromDictMatch = async (
  tableName: string,
  dictMatch: { [k: string]: any }
) => {
  const { error } = await supabase.from(tableName).delete().match(dictMatch);

  console.log(error);

  if (error) return { succes: false, error: error };
  return { success: true, error: null };
};

const getAllData = async (
  tableName: string
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
  const { data, error } = await supabase.from(tableName).select("*");
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getAllDataNeq = async (
  tableName: string,
  column: string,
  valueEqual: any
): Promise<{
  success: boolean;
  data: any | null;
  error: PostgrestError | null;
}> => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .neq(column, valueEqual);
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getAllDataEq = async (
  tableName: string,
  column: string,
  valueEqual: any
): Promise<{
  success: boolean;
  data: any[] | null;
  error: PostgrestError | null;
}> => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq(column, valueEqual);
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getAllDataColumn = async (
  tableName: string,
  colum: string
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
  const { data, error } = await supabase.from(tableName).select(colum);
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getData = async (
  tableName: string,
  column: string
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
  const { data, error } = await supabase.from(tableName).select(column);
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getDataEq = async (
  tableName: string,
  column: string,
  valueEqual: any
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from(tableName)
    .select(column)
    .eq(column, valueEqual);
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const getDataSingle = async (
  tableName: string,
  select: string,
  column: string,
  valueEqual: any
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from(tableName)
    .select(select)
    .eq(column, valueEqual)
    .single();
  if (error) return { success: false, data: null, error: error };
  return { success: true, data: data, error: null };
};

const updateColumns = async (
  tableName: string,
  dict: Record<string, any>,
  column: string,
  valueEqual: any
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await supabase.from(tableName).update([dict]).eq(column, valueEqual);
  } catch (error) {
    return { success: false, error: `Error unexpected: ${error}` };
  }
  return { success: true, error: null };
};

export const loginUsername = async (
  username: string,
  password: string,
  translations: any
) => {
  const { data, error } = await getAllDataEq(
    tableNameUsers,
    "username",
    username
  );
  if (error) return { success: false, data: null, error: error.message };
  if (!data || data.length === 0 || !verifyPassword(data[0].password, password))
    return {
      success: false,
      data: null,
      error: translations.verifyFields,
    };

  return {
    success: true,
    data: data[0],
    error: null,
  };
};

export const loginEmail = async (
  email: string,
  password: string,
  translations: any
) => {
  const { data, error } = await getAllDataEq(tableNameUsers, "email", email);

  if (error) return { success: false, data: null, error: error.message };

  if (!data || data.length === 0 || !verifyPassword(data[0].password, password))
    return {
      success: false,
      data: null,
      error: translations.verifyFields,
    };

  return {
    success: true,
    data: data[0],
    error: null,
  };
};

export const getId = async (token: string): Promise<string> => {
  const { data, error } = await getAllDataEq(tableNameUsers, "token", token);
  if (error || !data) return "";
  return data[0].id;
};

export {
  insertData,
  getData,
  getDataEq,
  getAllData,
  getAllDataEq,
  getAllDataNeq,
  getDataSingle,
  updateColumns,
  getAllDataColumn,
};
