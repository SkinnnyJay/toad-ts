import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { z } from "zod";

const logger = createClassLogger("FactsCache");

const factEntrySchema = z.object({
  id: z.number(),
  type: z.enum(["fact", "joke"]),
  text: z.string(),
});

const factsSchema = z.array(factEntrySchema);

export type FactEntry = z.infer<typeof factEntrySchema>;

let cached: FactEntry[] | null = null;

function resolveFactsPath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.join(dir, "..", "..");
  return path.join(projectRoot, "public", "facts.json");
}

/**
 * Load facts from public/facts.json. Idempotent: subsequent calls return the same cached array.
 */
export async function loadFacts(): Promise<FactEntry[]> {
  if (cached !== null) return cached;
  const filePath = resolveFactsPath();
  try {
    const raw = await readFile(filePath, ENCODING.UTF8);
    const parsed = z.unknown().parse(JSON.parse(raw));
    const list = factsSchema.parse(parsed);
    cached = list;
    return list;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Failed to load facts", { path: filePath, error: message });
    cached = [];
    return [];
  }
}

/**
 * Return cached facts if already loaded, otherwise null.
 */
export function getCachedFacts(): FactEntry[] | null {
  return cached;
}

/**
 * Return a random fact text from cache, or null if not loaded or empty.
 */
export function pickRandomFact(): string | null {
  const list = getCachedFacts();
  if (!list || list.length === 0) return null;
  const entry = list[Math.floor(Math.random() * list.length)];
  return entry?.text ?? null;
}
