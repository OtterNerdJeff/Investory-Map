import { defineConfig } from "@prisma/config";
import { loadEnvConfig } from "@next/env";

// Prisma 7 no longer reads `url = env("DATABASE_URL")` from schema.prisma,
// and it does not automatically load `.env.local` (only `.env`). Delegate
// env loading to Next.js's own loader so the precedence
// (`.env.local` > `.env.development` > `.env`) matches what `next dev` /
// `next build` use. `@next/env` is bundled with `next` — no extra dep.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
