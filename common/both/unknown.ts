export const URI_EXTENSION = "file:///" as const;
export const EXTENSION_ENCRYPTED = ".enc" as const;
export const CONTENT_URI_EXTENSION = "content://" as const;

type Options = {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export const getDateWithTimeAhead = (options: Options): Date => {
  const date = new Date();
  if (options.days) date.setDate(date.getDate() + options.days);
  if (options.hours) date.setHours(date.getHours() + options.hours);
  if (options.minutes) date.setMinutes(date.getMinutes() + options.minutes);
  if (options.seconds) date.setSeconds(date.getSeconds() + options.seconds);
  return date;
};
