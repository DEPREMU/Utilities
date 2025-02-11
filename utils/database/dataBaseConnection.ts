import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

const insertData = async (
  tableName: string,
  dict: object
): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    await supabase.from(tableName).insert([dict]);
  } catch (error) {
    return { success: false, error: `Error unexpected: ${error}` };
  }
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
): Promise<{ success: boolean; data: any; error: PostgrestError | null }> => {
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
