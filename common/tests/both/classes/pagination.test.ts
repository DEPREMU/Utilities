import { Pagination } from "../../../both/classes/pagination";
import { describe, test, expect, jest } from "@jest/globals";

type Item = {
  id: string;
  name: string;
};

const createMockItem = (id: number): Item => ({
  id: String(id),
  name: `Item ${id}`,
});

const createItems = (start: number, count: number): Item[] =>
  Array.from({ length: count }, (_, i) => createMockItem(start + i));

describe("Pagination", () => {
  describe("Initialization & Default Options", () => {
    test("initializes with default options", () => {
      const pagination = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 10 },
      );

      expect(pagination.take).toBe(10);
      expect(pagination.page).toBe(-1);
      expect(pagination.totalItems).toBe(0);
      expect(pagination.isLatest).toBe(false);
      expect(pagination.allData).toEqual([]);
      expect(pagination.currentData).toEqual([]);
    });

    test("accepts custom size and falls back to default if size <= 0", () => {
      const p1 = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 25 },
      );
      expect(p1.take).toBe(25);

      const p2 = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 0 },
      );
      expect(p2.take).toBe(10);

      const p3 = new Pagination<Item>(
        async () => [],
        () => {},
        { take: -5 },
      );
      expect(p3.take).toBe(10);
    });

    test("passes initial startId to the first getData call", async () => {
      const getData = jest.fn(async (_cursor: string | null) =>
        createItems(1, 10),
      );

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10, startId: "cursor-initial" },
      );

      await pagination.next();

      expect(getData).toHaveBeenCalledTimes(1);
      expect(getData).toHaveBeenCalledWith("cursor-initial");
    });
  });

  describe("Forward Navigation (next)", () => {
    test("fetches first page with null cursor when no startId is provided", async () => {
      const getData = jest.fn(async (_cursor: string | null) =>
        createItems(1, 10),
      );
      const onValid = jest.fn(
        (data: Item[], addId: (id: string) => void, _isLatest: () => void) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
      );

      const pagination = new Pagination<Item>(getData, onValid, { take: 10 });

      const res = await pagination.next();

      expect(getData).toHaveBeenCalledTimes(1);
      expect(getData).toHaveBeenCalledWith(null);
      expect(onValid).toHaveBeenCalledTimes(1);
      expect(pagination.page).toBe(0);
      expect(pagination.totalItems).toBe(10);
      expect(res).toHaveLength(10);
      expect(pagination.currentData).toEqual(createItems(1, 10));
      expect(pagination.allData).toEqual(createItems(1, 10));
    });

    test("fetches successive pages and passes the last cursor from addId", async () => {
      const getData = jest.fn(async (cursor: string | null) => {
        if (!cursor) return createItems(1, 10);
        if (cursor === "10") return createItems(11, 10);
        return [];
      });

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      expect(pagination.page).toBe(0);
      expect(pagination.currentData[0].id).toBe("1");

      await pagination.next();
      expect(getData).toHaveBeenLastCalledWith("10");
      expect(pagination.page).toBe(1);
      expect(pagination.totalItems).toBe(20);
      expect(pagination.currentData[0].id).toBe("11");
      expect(pagination.allData).toHaveLength(20);
    });

    test("uses cached data when moving forward after moving backward", async () => {
      const getData = jest.fn(async (cursor: string | null) => {
        if (!cursor) return createItems(1, 10);
        if (cursor === "10") return createItems(11, 10);
        return [];
      });

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      await pagination.next();
      expect(getData).toHaveBeenCalledTimes(2);

      await pagination.prev();
      expect(pagination.page).toBe(0);
      expect(pagination.currentData[0].id).toBe("1");

      const cachedPage = await pagination.next();
      expect(getData).toHaveBeenCalledTimes(2);
      expect(pagination.page).toBe(1);
      expect(cachedPage?.[0].id).toBe("11");
      expect(pagination.currentData[0].id).toBe("11");
    });
  });

  describe("Backward Navigation (prev)", () => {
    test("returns null when prev() is called before any next() call", async () => {
      const pagination = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 10 },
      );

      const res = await pagination.prev();
      expect(res).toBeNull();
      expect(pagination.page).toBe(-1);
    });

    test("navigates backward between loaded pages without removing data", async () => {
      const pagination = new Pagination<Item>(
        async (cursor) => {
          if (!cursor) return createItems(1, 10);
          return createItems(11, 10);
        },
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      await pagination.next();
      expect(pagination.page).toBe(1);

      const prevRes = await pagination.prev();
      expect(pagination.page).toBe(0);
      expect(prevRes).toEqual(createItems(1, 10));
      expect(pagination.currentData).toEqual(createItems(1, 10));
      expect(pagination.totalItems).toBe(20);
    });

    test("UNEXPECTED BEHAVIOR: prev() on the first loaded page decrements page to -1 and returns [] instead of null", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      expect(pagination.page).toBe(0);

      const res = await pagination.prev();
      expect(pagination.page).toBe(-1);
      expect(res).toEqual([]);

      const secondCall = await pagination.prev();
      expect(secondCall).toBeNull();
    });

    test("prev(true) removes data for the current page and pops id", async () => {
      const pagination = new Pagination<Item>(
        async (cursor) => {
          if (!cursor) return createItems(1, 10);
          return createItems(11, 10);
        },
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      await pagination.next();
      expect(pagination.totalItems).toBe(20);
      expect(pagination.page).toBe(1);

      await pagination.prev(true);
      expect(pagination.page).toBe(0);
      expect(pagination.totalItems).toBe(10);
      expect(pagination.allData).toEqual(createItems(1, 10));
      expect(pagination.currentData).toEqual(createItems(1, 10));
    });

    test("UNEXPECTED BEHAVIOR: prev(true) on the first page deletes page 0 data from allData", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      expect(pagination.totalItems).toBe(10);

      await pagination.prev(true);
      expect(pagination.page).toBe(-1);
      expect(pagination.totalItems).toBe(0);
      expect(pagination.allData).toEqual([]);
    });
  });

  describe("Latest Page / End of Pagination (isLatest)", () => {
    test("sets isLatest to true when onValid calls isLatest()", async () => {
      const pagination = new Pagination<Item>(
        async (cursor) => {
          if (!cursor) return createItems(1, 10);
          return [];
        },
        (data, addId, isLatest) => {
          if (data.length === 0) return isLatest();
          addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      expect(pagination.isLatest).toBe(false);

      await pagination.next();
      expect(pagination.isLatest).toBe(true);
    });

    test("UNEXPECTED BEHAVIOR: when isLatest() is called, next() returns [] (truthy) instead of null", async () => {
      const pagination = new Pagination<Item>(
        async (cursor) => {
          if (!cursor) return createItems(1, 10);
          return [];
        },
        (data, addId, isLatest) => {
          if (data.length === 0) return isLatest();
          addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();

      const endResult = await pagination.next();
      expect(endResult).toEqual([]);
      expect(pagination.isLatest).toBe(true);

      const subsequentResult = await pagination.next();
      expect(subsequentResult).toBeNull();
    });

    test("prev() resets isLatest to false", async () => {
      const pagination = new Pagination<Item>(
        async (cursor) => {
          if (!cursor) return createItems(1, 10);
          return [];
        },
        (data, addId, isLatest) => {
          if (data.length === 0) return isLatest();
          addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      await pagination.next();
      expect(pagination.isLatest).toBe(true);

      await pagination.prev();
      expect(pagination.isLatest).toBe(false);
    });
  });

  describe("ID History & Max History Limit", () => {
    test("caps cursor history at maxIdHistory by shifting older IDs", async () => {
      const recordedCursors: (string | null)[] = [];
      const getData = jest.fn(async (cursor: string | null) => {
        recordedCursors.push(cursor);
        return [createMockItem(recordedCursors.length)];
      });

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 1, maxIdHistory: 2 },
      );

      await pagination.next();

      await pagination.next();

      await pagination.next();

      expect(recordedCursors).toEqual([null, "1", "2"]);
    });

    test("UNEXPECTED BEHAVIOR: maxIdHistory <= 0 defaults to 3 only for 0, while negative numbers allow invalid history size", () => {
      const p1 = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 10, maxIdHistory: 0 },
      );

      expect(p1).toBeDefined();

      const p2 = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 10, maxIdHistory: -1 },
      );

      expect(p2).toBeDefined();
    });
  });

  describe("Invalid ID & Fallback Loop", () => {
    test("removes invalidId from history and falls back to previous cursor", async () => {
      const requestedCursors: (string | null)[] = [];

      const getData = jest.fn(async (cursor: string | null) => {
        requestedCursors.push(cursor);
        if (cursor === "bad-cursor") return "invalidId" as const;
        return [createMockItem(100)];
      });

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 1 },
      );

      await pagination.next();
      expect(requestedCursors).toEqual([null]);

      const paginationWithBad = new Pagination<Item>(
        async (cursor: string | null) => {
          if (cursor === "cursor-2") return "invalidId" as const;
          if (cursor === "cursor-1") return [createMockItem(2)];
          return [createMockItem(1)];
        },
        (data, addId) => {
          if (data.length > 0) addId(`cursor-${data[0].id}`);
        },
        { take: 1 },
      );

      await paginationWithBad.next();
      await paginationWithBad.next();

      const fallbackResult = await paginationWithBad.next();
      expect(fallbackResult).toBeDefined();
      expect(fallbackResult?.[0].id).toBe("2");
    });

    test("UNEXPECTED BEHAVIOR: falling back to previous cursor duplicates data in allData", async () => {
      let callCount = 0;
      const pagination = new Pagination<Item>(
        async (cursor: string | null) => {
          callCount++;
          if (callCount === 1) return [createMockItem(1)];
          if (callCount === 2) return [createMockItem(2)];
          if (cursor === "cursor-2") return "invalidId" as const;

          return [createMockItem(2)];
        },
        (data, addId) => {
          if (data.length > 0) addId(`cursor-${data[0].id}`);
        },
        { take: 1 },
      );

      await pagination.next();
      await pagination.next();
      expect(pagination.totalItems).toBe(2);

      await pagination.next();
      expect(pagination.totalItems).toBe(3);
      expect(pagination.allData.map((i) => i.id)).toEqual(["1", "2", "2"]);
    });

    test("returns null if all cursors in history are invalidId", async () => {
      const pagination = new Pagination<Item>(
        async () => "invalidId" as const,
        () => {},
        { take: 10, startId: "bad-id" },
      );

      const res = await pagination.next();
      expect(res).toBeNull();
    });

    test("UNEXPECTED BEHAVIOR: if startId is invalid, it returns null without attempting to fetch from null", async () => {
      const requestedCursors: (string | null)[] = [];
      const getData = jest.fn(async (cursor: string | null) => {
        requestedCursors.push(cursor);
        if (cursor === "invalid-start") return "invalidId" as const;
        return createItems(1, 10);
      });

      const pagination = new Pagination<Item>(getData, () => {}, {
        take: 10,
        startId: "invalid-start",
      });

      const res = await pagination.next();
      expect(res).toBeNull();

      expect(requestedCursors).toEqual(["invalid-start"]);
    });
  });

  describe("Page Size & Partial Page Edge Cases", () => {
    test("UNEXPECTED BEHAVIOR: partial page causes currentData to slice incorrectly on subsequent pages", async () => {
      let pageNum = 0;
      const pagination = new Pagination<Item>(
        async () => {
          pageNum++;

          if (pageNum === 1) return createItems(1, 3);

          return createItems(4, 10);
        },
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      expect(pagination.currentData).toHaveLength(3);

      await pagination.next();

      expect(pagination.currentData).toHaveLength(3);
    });

    test("UNEXPECTED BEHAVIOR: partial page breaks cached navigation forward", async () => {
      let pageNum = 0;
      const getData = jest.fn(async (_cursor: string | null) => {
        pageNum++;
        if (pageNum === 1) return createItems(1, 5);
        return createItems(6, 10);
      });

      const pagination = new Pagination<Item>(
        getData,
        (data, addId) => {
          if (data.length > 0) addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      await pagination.next();
      await pagination.prev();

      await pagination.next();
      expect(getData).toHaveBeenCalledTimes(1);

      await pagination.next();
      expect(getData).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    test("rethrows errors thrown by getData", async () => {
      const error = new Error("Network request failed");
      const pagination = new Pagination<Item>(
        async () => {
          throw error;
        },
        () => {},
        { take: 10 },
      );

      await expect(pagination.next()).rejects.toThrow("Network request failed");

      expect(pagination.page).toBe(-1);
      expect(pagination.totalItems).toBe(0);
    });

    test("throws if getData or onValid are not provided", async () => {
      const p1 = new Pagination<Item>(
        null as unknown as () => Promise<Item[]>,
        () => {},
        { take: 10 },
      );
      await expect(p1.next()).rejects.toThrow(
        "Pagination getData not implemented",
      );

      const p2 = new Pagination<Item>(
        async () => [],
        null as unknown as () => void,
        { take: 10 },
      );
      await expect(p2.next()).rejects.toThrow(
        "Pagination onValid not implemented",
      );
    });

    test("non-Error exceptions thrown in getData are ignored in the catch block", async () => {
      let threw = false;
      const pagination = new Pagination<Item>(
        async () => {
          if (!threw) {
            threw = true;

            throw "non-error string";
          }
          return createItems(1, 10);
        },
        () => {},
        { take: 10 },
      );

      const res = await pagination.next();
      expect(res).toBeNull();
    });
  });

  describe("Internal State Exposure", () => {
    test("UNEXPECTED BEHAVIOR: allData is a copy, but it shouldn't expose the direct internal array reference", () => {
      const pagination = new Pagination<Item>(
        async () => [],
        () => {},
        { take: 10 },
      );

      const data = pagination.allData;
      data.push(createMockItem(999));

      expect(pagination.totalItems).toBe(0);
      expect(pagination.allData).toHaveLength(0);
    });
  });

  describe("Full Lifecycle Simulation (similar to manual test)", () => {
    test("simulates complete next(), prev(), cached next(), and prev(true) cycle", async () => {
      let x = 1;
      const pagination = new Pagination<Item>(
        async (last) => {
          if (!last) return createItems(x, 10);
          x += 10;
          if (pagination.page > 4) return [];
          return createItems(x, 10);
        },
        (data, addId, isLatest) => {
          if (data.length === 0) return isLatest();
          addId(data[data.length - 1].id);
        },
        { take: 10 },
      );

      const capturedPages: Item[][] = [];

      while (await pagination.next()) {
        if (pagination.currentData.length > 0) {
          capturedPages.push([...pagination.currentData]);
        }
      }

      const totalFetched = pagination.totalItems;
      expect(totalFetched).toBeGreaterThan(0);
      expect(pagination.isLatest).toBe(true);

      const backwardsPages: Item[][] = [];
      while (await pagination.prev()) {
        if (pagination.currentData.length > 0) {
          backwardsPages.push([...pagination.currentData]);
        }
      }
      expect(backwardsPages.length).toBeGreaterThan(0);
      expect(pagination.totalItems).toBe(totalFetched);

      for (const page of capturedPages) {
        await pagination.next();
        expect(pagination.currentData).toEqual(page);
      }

      while (await pagination.prev(true)) {
        // clearing
      }

      expect(pagination.allData).toHaveLength(0);
    });
  });

  describe("Event Handling", () => {
    test("triggers dataReceived event when data is received", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        () => {},
        { take: 10 },
      );

      const dataReceived = jest.fn();
      pagination.addEventListener("dataAdded", dataReceived);

      await pagination.next();
      expect(dataReceived).toHaveBeenCalledWith(createItems(1, 10));
    });

    test("triggers dataRemoved event when data is removed", async () => {
      const items = createItems(1, 10);
      const pagination = new Pagination<Item>(
        async () => items,
        () => {},
        { take: 10 },
      );
      await pagination.next();

      const dataRemoved = jest.fn();
      pagination.addEventListener("dataRemoved", dataRemoved);

      await pagination.prev(true);
      expect(dataRemoved).toHaveBeenCalledWith(items);
    });

    test("triggers noMoreData event when no more data is available", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        (_1, _2, isLatest) => {
          isLatest();
        },
        { take: 10 },
      );

      const noMoreData = jest.fn();
      pagination.addEventListener("lastDataUpdate", noMoreData);

      await pagination.next();
      expect(noMoreData).toHaveBeenCalled();
    });

    test("removeEventListener removes a listener", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        () => {},
        { take: 10 },
      );

      const listener = jest.fn();
      const emitter = pagination.addEventListener("dataAdded", listener);

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);

      emitter.remove();

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("removeEventListeners removes all listeners for a specific event", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        () => {},
        { take: 10 },
      );

      const listener = jest.fn();
      pagination.addEventListener("dataAdded", listener);
      pagination.addEventListener("dataAdded", listener);

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);

      pagination.removeEventListeners("dataAdded");

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("removeEventListeners removes all listeners if no event is specified", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        () => {},
        { take: 10 },
      );

      const listener = jest.fn();
      pagination.addEventListener("dataAdded", listener);
      pagination.addEventListener("dataRemoved", listener);

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);

      await pagination.prev(true);
      expect(listener).toHaveBeenCalledTimes(2);

      pagination.removeEventListeners();

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(2);
    });

    test("destroy removes all listeners", async () => {
      const pagination = new Pagination<Item>(
        async () => createItems(1, 10),
        () => {},
        { take: 10 },
      );

      const listener = jest.fn();
      pagination.addEventListener("dataAdded", listener);
      pagination.addEventListener("dataRemoved", listener);

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(1);

      await pagination.prev(true);
      expect(listener).toHaveBeenCalledTimes(2);

      pagination.removeEventListeners();

      await pagination.next();
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
