import fs from "fs";
import path from "path";
import { Script } from "../common";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { Directory, File } from "@commonSrc/serverOrElectron";

const script = new Script();

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

script.addStep("Find .txt files", async () => {
  const dir = new Directory(script.PATHS.app);
  const files = (await dir.readDir()).filter((f) => f.endsWith(".txt"));
  script.addValue("txtFiles", files);
});

script.addStep("Process .txt files", async () => {
  const files = script.getValue("txtFiles") as string[];

  for (const file of files) {
    const entries = parseInput(path.resolve(script.PATHS.app, file));
    const output = encodeBinary(entries);
    await new File(
      path.resolve(script.PATHS.app, file.replace(".txt", ".dict")),
    ).writeFile(output);
    Logger.log(
      `Built ${file.replace(".txt", ".dict")} from ${file} with ${entries.length} words`,
    );
  }
});

script.run();
