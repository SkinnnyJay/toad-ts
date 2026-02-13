import { LIMIT } from "@/config/limits";
import type { TokenizerEstimate } from "./tokenOptimizer.types";

export interface TokenizerAdapter {
  readonly name: string;
  estimate(input: string): TokenizerEstimate;
}

type EncodeFunction = (input: string) => number[];

const loadGptTokenizer = (): EncodeFunction | null => {
  try {
    const candidate: unknown = require("gpt-tokenizer");
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "encode" in candidate &&
      typeof (candidate as { encode: unknown }).encode === "function"
    ) {
      return (candidate as { encode: EncodeFunction }).encode;
    }

    return null;
  } catch (_error) {
    return null;
  }
};

const toCharCount = (input: string): number => Array.from(input).length;

const toByteSize = (input: string): number =>
  typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(input).length
    : Buffer.from(input, "utf8").length;

const approximateTokenCount = (input: string): number => {
  const charCount = toCharCount(input);
  if (charCount === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(charCount / LIMIT.CHARS_PER_TOKEN_ESTIMATE));
};

export const createDefaultTokenizerAdapter = (): TokenizerAdapter => {
  const encode = loadGptTokenizer();

  if (encode) {
    return {
      name: "gpt-tokenizer",
      estimate: (input) => {
        const tokens = encode(input);
        return {
          tokenCount: tokens.length,
          charCount: toCharCount(input),
          byteSize: toByteSize(input),
        };
      },
    };
  }

  return {
    name: "basic-estimator",
    estimate: (input) => ({
      tokenCount: approximateTokenCount(input),
      charCount: toCharCount(input),
      byteSize: toByteSize(input),
    }),
  };
};
