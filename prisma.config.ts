import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Conexión directa (sin pooler) — la usan `prisma migrate`/`prisma studio`.
    url: env("DIRECT_URL"),
  },
});
