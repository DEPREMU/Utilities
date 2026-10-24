import cloneDeep from "lodash/cloneDeep";
import { EventHandler } from "./events";

type GetData<T> = (lastId: string | null) => Promise<T[] | "invalidId">;

type AddId = (id: string) => void;

type IsLatest = () => void;

type OnValid<T> = (currentData: T[], addId: AddId, isLatest: IsLatest) => void;

type PaginationOptions = {
  take: number;
  startId?: string;
  maxIdHistory?: number;
};

type Events<T> = {
  dataAdded: (data: T[]) => void;
  dataRemoved: (data: T[]) => void;
  lastDataUpdate: (isLast: boolean) => void;
};

export class Pagination<T> extends EventHandler<Events<T>> {
  #page: number = 0;

  public get page() {
    return this.#page - 1;
  }

  #take: number = 10;

  public get take() {
    return this.#take;
  }

  #isLast: boolean = false;

  public get isLatest() {
    return this.#isLast;
  }

  #maxIdHistory: number = 3;

  #ids: string[] = [];

  #data: T[] = [];

  public get allData() {
    return cloneDeep(this.#data);
  }

  public get totalItems() {
    return this.#data.length;
  }

  set #updateLastData(value: boolean) {
    this.#isLast = value;
    this.emit("lastDataUpdate", value);
  }

  private _getData: GetData<T>;

  private _onValid: OnValid<T>;

  #lastFunction: IsLatest = () => {
    this.#page--;
    this.#updateLastData = true;
  };

  #addId: AddId = (id) => {
    this.#ids.push(id);
    if (this.#ids.length > this.#maxIdHistory) this.#ids.shift();
  };

  public get currentData() {
    const sliceStart = this.page * this.#take;

    return cloneDeep(
      this.#data.slice(
        sliceStart,
        this.#data.length > this.#take + sliceStart
          ? this.#take + sliceStart
          : this.#data.length,
      ),
    );
  }

  public async next(): Promise<T[] | null> {
    if (!this._getData) throw new Error("Pagination getData not implemented");
    if (!this._onValid) throw new Error("Pagination onValid not implemented");

    if (this.#data.length >= this.#page * this.#take + 1) {
      this.#page++;
      return this.currentData;
    }

    for (let i = this.#ids.length || 1; i > 0; i--) {
      const currentIndex = i - 1;

      try {
        if (this.#isLast) return null;

        const res = await this._getData(this.#ids[currentIndex] ?? null);
        if (res === "invalidId") throw new Error("Invalid");

        this._onValid(res, this.#addId, this.#lastFunction);

        this.#page++;
        this.#data.push(...res);
        this.emit("dataAdded", res);
        return res;
      } catch (e) {
        if (!(e instanceof Error)) continue;

        if (e.message === "Invalid") this.#ids.splice(currentIndex, 1);
        else throw e;
      }
    }

    return null;
  }

  public async prev(removeData?: boolean): Promise<T[] | null> {
    if (this.#page === 0) return null;

    this.#page--;
    if (removeData) {
      const deleted = this.#data.splice(this.#page * this.#take, this.#take);
      this.#ids.pop();
      this.emit("dataRemoved", deleted);
    }
    this.#updateLastData = false;

    return this.currentData;
  }

  public clear() {
    this.#page = 0;
    this.#ids = [];

    this.emit("dataRemoved", this.#data);
    this.#data = [];

    this.#updateLastData = false;
  }

  constructor(
    getData: GetData<T>,
    onValid: OnValid<T>,
    options: PaginationOptions,
  ) {
    super();
    this._getData = getData;
    this._onValid = onValid;

    const {
      take = this.#take,
      startId,
      maxIdHistory = this.#maxIdHistory,
    } = options ?? {};

    const calculatedTake = take > 0 ? take : this.#take;
    const calculatedMaxIdHistory =
      maxIdHistory > 0 ? maxIdHistory : this.#maxIdHistory;

    if (startId) this.#ids.push(startId);

    this.#take = calculatedTake;
    this.#maxIdHistory = calculatedMaxIdHistory;
  }
}
