import { defineConfig } from "prisma/config";

const DEFAULT_DATABASE_URL = "file:./.toadstool/toadstool.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
});
