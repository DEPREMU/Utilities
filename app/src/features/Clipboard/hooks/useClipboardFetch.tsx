import { Logger, sessionManager, storageManagement } from "@/utils";
import { Pagination, ServerFetch } from "@common";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Value = {
  pagination: Pagination<DB["TablesClient"]["ClipboardSync"]>;
  searchText: string;
  deleted: boolean;
  setDeleted: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
};

const logger = new Logger("useClipboardFetch");

export const useClipboardFetch = (): Value => {
  const [pagination] = useState(
    new Pagination(
      async (lastId) => {
        const { sessionToken } = sessionManager.getSessionData();
        if (!sessionToken) return [];

        try {
          const res = await ServerFetch.get(
            "/clipboard/:deviceId{/:lastId}",
            {
              query: {
                query: searchTextRef.current,
                deleted: false,
              },
              params: {
                lastId: lastId || (null as never),
                deviceId: storageManagement.get("DEVICE_ID"),
              },
            },
            sessionToken,
          );

          if ("error" in res.data) return [];

          return res.data.clipboardItems;
        } catch (error) {
          logger.error("Error fetching clipboard data", error);
          return "invalidId";
        }
      },
      (currentData, addId, isLatest) => {
        if (currentData.length === 0) return isLatest();

        const id = currentData?.[currentData.length - 1]?.id;
        if (id) addId(id);
        else isLatest();
      },
      { take: 10 },
    ),
  );

  const [searchText, setSearchText] = useState("");
  const searchTextRef = useRef(searchText);

  const [deleted, setDeleted] = useState(false);
  const deletedRef = useRef(deleted);

  useEffect(() => {
    deletedRef.current = deleted;
    searchTextRef.current = searchText;
  }, [deleted, searchText]);

  const value = useMemo<Value>(
    () => ({
      deleted,
      setDeleted,
      pagination,
      searchText,
      setSearchText,
    }),
    [deleted, pagination, searchText],
  );

  return value;
};
