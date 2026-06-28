import { Logger } from "@common";
import chalk from "chalk";

export const PAGE_SIZE = 10;

export const getPagination = <T>(
  callback: (skip: number, take: number) => T,
) => {
  let page = 0;

  const getNext = () => callback(page++ * PAGE_SIZE, PAGE_SIZE);

  const reset = () => {
    page = 0;
  };

  const getCurrentPage = () => page;

  const setPage = (newPage: number) => {
    page = newPage;
  };

  return { reset, getNext, setPage, getCurrentPage };
};

export const getInterval = (
  callback: () => Promise<void>,
  interval: number,
  name: string,
) => {
  Logger.log(chalk.blue(`Starting ${name} interval...`));

  let promise: Promise<void> | null = null;

  return setInterval(async () => {
    if (promise) return;

    if (!promise) {
      promise = callback();
    }

    await promise;
    promise = null;
  }, interval);
};
