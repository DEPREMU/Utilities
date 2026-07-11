import fs from "fs";
import path from "path";
import { APP_PATH } from "../config.ts";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";

const HEADER = "UDICT1";
const MAX_WORDS = 300_000;

type Entry = {
  word: string;
  freq: number;
};

const normalizeWord = (raw: string): string => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  let out = "";
  for (const ch of trimmed) {
    if (/\p{L}/u.test(ch)) out += ch;
  }
  return out;
};

const parseInput = (filePath: string): Entry[] => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const map = new Map<string, number>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const word = normalizeWord(parts[0] ?? "");
    if (!word) continue;

    const parsedFreq = Number.parseInt(parts[1] ?? "1", 10);
    const freq = Number.isFinite(parsedFreq) && parsedFreq > 0 ? parsedFreq : 1;

    const current = map.get(word) ?? 0;
    if (freq > current) {
      map.set(word, freq);
    }
  }

  return [...map.entries()]
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, MAX_WORDS)
    .map(([word, freq]) => ({ word, freq }));
};

const encodeBinary = (entries: Entry[]): Buffer => {
  const header = Buffer.from(HEADER, "ascii");
  const version = Buffer.from([1]);
  const count = Buffer.alloc(4);
  count.writeUInt32LE(entries.length, 0);

  const payloadParts: Buffer[] = [header, version, count];

  for (const entry of entries) {
    const wordBytes = Buffer.from(entry.word, "utf8");
    if (wordBytes.length > 65535) continue;

    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16LE(wordBytes.length, 0);

    const freqBuf = Buffer.alloc(4);
    freqBuf.writeUInt32LE(entry.freq >>> 0, 0);

    payloadParts.push(lenBuf, wordBytes, freqBuf);
  }

  return Buffer.concat(payloadParts);
};

const run = () => {
  const pathFiles = path.resolve(APP_PATH, "native/autocomplete");

  const files = fs.readdirSync(pathFiles).filter((f) => f.endsWith(".txt"));

  for (const item of files) {
    const entries = parseInput(path.resolve(pathFiles, item));
    const output = encodeBinary(entries);
    fs.writeFileSync(
      path.resolve(pathFiles, item.replace(".txt", ".dict")),
      output,
    );
    Logger.log(
      `Built ${item.replace(".txt", ".dict")} from ${item} with ${entries.length} words`,
    );
  }
};

run();
