import { z } from "zod";

/**
 * Context passed to custom tool execute() functions.
 */
export interface CustomToolContext {
  agent: string;
  sessionID: string;
  directory: string;
  worktree: string;
}

/**
 * Definition of a custom tool, created with the tool() helper.
 */
export interface CustomToolDefinition<TArgs extends z.ZodType = z.ZodType> {
  description: string;
  args: TArgs;
  execute: (args: z.infer<TArgs>, context: CustomToolContext) => Promise<string>;
}

/**
 * Helper function for defining custom tools with Zod schema validation.
 * Used in .opencode/tools/*.ts and .toadstool/tools/*.ts files.
 *
 * @example
 * ```ts
 * export default tool({
 *   description: "Query the project database",
 *   args: { query: tool.schema.string().describe("SQL query") },
 *   async execute(args, context) {
 *     return `Executed: ${args.query}`;
 *   },
 * });
 * ```
 */
export const tool = <T extends Record<string, z.ZodType>>(config: {
  description: string;
  args: T;
  execute: (args: { [K in keyof T]: z.infer<T[K]> }, context: CustomToolContext) => Promise<string>;
}): CustomToolDefinition<z.ZodObject<T>> => {
  const schema = z.object(config.args);
  return {
    description: config.description,
    args: schema,
    execute: async (args, context) => {
      const validated = schema.parse(args);
      return config.execute(validated, context);
    },
  };
};

/**
 * Convenience schema accessors for the tool() helper.
 */
tool.schema = z;

/**
 * Load a custom tool file and extract all tool exports.
 * Multi-export files create `<file>_<export>` named tools.
 */
export const extractToolExports = (
  moduleExports: Record<string, unknown>,
  fileName: string
): Array<{ name: string; definition: CustomToolDefinition }> => {
  const tools: Array<{ name: string; definition: CustomToolDefinition }> = [];

  for (const [exportName, exportValue] of Object.entries(moduleExports)) {
    if (!isCustomToolDefinition(exportValue)) continue;

    const name = exportName === "default" ? fileName : `${fileName}_${exportName}`;
    tools.push({ name, definition: exportValue });
  }

  return tools;
};

const isCustomToolDefinition = (value: unknown): value is CustomToolDefinition =>
  typeof value === "object" &&
  value !== null &&
  "description" in value &&
  "args" in value &&
  "execute" in value &&
  typeof (value as CustomToolDefinition).execute === "function";
