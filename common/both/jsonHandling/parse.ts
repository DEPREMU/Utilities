const functionFallback = (functionName: string) => () =>
  // eslint-disable-next-line no-console
  console.log(
    `Function created after parsed data, original function name: "${functionName}"`,
  );

const symbolFallback = (symbolName: string) =>
  Symbol(
    `Symbol created after parsed data, original symbol name: "${symbolName}"`,
  );

const getCorrectParsed = <T = object | null>(obj: object | null): T => {
  if (!obj) return null as T;
  if (Array.isArray(obj))
    return obj.map((value) => {
      if (value === "<<Function>>") return functionFallback(value);
      if (value === "<<Symbol>>") return symbolFallback(value);
      if (typeof value === "object") return getCorrectParsed<T>(value);
      return value;
    }) as T;
  else
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (value === "<<Function>>") return [key, functionFallback(key)];
        if (value === "<<Symbol>>") return [key, symbolFallback(key)];
        if (typeof value === "object") return [key, getCorrectParsed(value)];
        return [key, value];
      }),
    ) as T;
};

export const parseData = <T = object | null>(
  value: string | null,
): T | null => {
  let parsed: T;
  try {
    if (!value) return value as T;

    if (value.includes("<<Symbol>>") || value.includes("<<Function>>")) {
      const parsedValue = JSON.parse(value);

      return getCorrectParsed<T>(parsedValue);
    } else parsed = JSON.parse(value || "null") as T;
  } catch {
    parsed = value as T;
  }
  return parsed;
};
