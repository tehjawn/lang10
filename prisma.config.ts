import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Read directly rather than via prisma's `env()` helper, which throws when
    // the variable is missing. `prisma generate` must succeed during a Docker
    // build, where no database is attached.
    url: process.env.DATABASE_URL ?? "",
  },
});
