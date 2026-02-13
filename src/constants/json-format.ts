import { LIMIT } from "@/config/limits";

export const JSON_FORMAT = {
  INDENT_SPACES: LIMIT.JSON_INDENT_SPACES,
} as const;

export const { INDENT_SPACES } = JSON_FORMAT;
