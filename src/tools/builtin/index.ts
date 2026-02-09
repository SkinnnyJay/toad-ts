import type { ToolDefinition } from "@/tools/types";

import { bashTool } from "./bash";
import { editTool } from "./edit";
import { globTool } from "./glob";
import { grepTool } from "./grep";
import { listTool } from "./list";
import { questionTool } from "./question";
import { readTool } from "./read";
import { todoReadTool } from "./todo-read";
import { todoWriteTool } from "./todo-write";
import { webfetchTool } from "./webfetch";
import { writeTool } from "./write";

export const createBuiltInTools = (): Array<ToolDefinition<unknown>> => [
  bashTool,
  readTool,
  writeTool,
  editTool,
  grepTool,
  globTool,
  listTool,
  todoReadTool,
  todoWriteTool,
  webfetchTool,
  questionTool,
];

export {
  bashTool,
  readTool,
  writeTool,
  editTool,
  grepTool,
  globTool,
  listTool,
  todoReadTool,
  todoWriteTool,
  webfetchTool,
  questionTool,
};
