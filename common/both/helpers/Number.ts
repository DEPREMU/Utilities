export class Numbers {
  static randInt(min: number, max: number = Number.MAX_SAFE_INTEGER): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
