import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { z } from "zod";

const logger = createClassLogger("PackageInfo");

const packageInfoSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
  })
  .strict();

export type PackageInfo = z.infer<typeof packageInfoSchema>;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const resolvePackagePaths = (): string[] => {
  const paths: string[] = [];
  paths.push(path.join(process.cwd(), "package.json"));
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  paths.push(path.join(currentDir, "..", "package.json"));
  return paths;
};

export const loadPackageInfo = async (): Promise<PackageInfo | null> => {
  const paths = resolvePackagePaths();
  for (const filePath of paths) {
    try {
      const raw = await readFile(filePath, ENCODING.UTF8);
      return packageInfoSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to load package info", { path: filePath, error: message });
    }
  }
  return null;
};
