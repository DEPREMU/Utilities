import axios from "axios";
import { dataIP_APIJSON, dataIPQueryJSON } from "@types";

export const getIP = async () => {
  const { data } = await axios.get("https://api.ipquery.io/");
  return data;
};

export const getDataIPQuery = async (
  ip: string,
): Promise<dataIPQueryJSON | null> => {
  const response = await axios.get(`https://api.ipquery.io/${ip}`, {
    timeout: 10000,
  });
  return response.status === 200 ? response.data : null;
};

export const getDataIP_api = async (
  ip: string,
): Promise<dataIP_APIJSON | null> => {
  try {
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=66846719`,
      {
        timeout: 10000,
      },
    );
    return response.status === 200 ? response.data : null;
  } catch {
    return null;
  }
};
