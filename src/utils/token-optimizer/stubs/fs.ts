import { readFile } from "node:fs/promises";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";

const cache = new Map<string, string>();

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error;
}

export async function readTextCached(filePath: string): Promise<string> {
  const cached = cache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const content = await readFile(filePath, ENCODING.UTF8);
    cache.set(filePath, content);
    return content;
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return "";
    }
    throw error;
  }
}

export function invalidateCachedText(filePath: string): void {
  cache.delete(filePath);
}
