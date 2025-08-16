import env from "./env.ts";

export const host: string = env.HOST || "localhost";
export const port: number = Number(env.PORT) || 3000;
export const useHTTPS: boolean = env.USE_HTTPS;
