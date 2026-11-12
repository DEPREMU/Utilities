import "./sessions";

import { prisma } from "./postgres";

await import("./backups");

export { prisma };
