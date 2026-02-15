const STREAM_PARSER_BUFFER = {
  NEWLINE: "\n",
} as const;

export interface StreamParserBufferResult {
  lines: string[];
  remainder: string;
  overflowed: boolean;
}

const trimBufferToMaxBytes = (value: string, maxBytes: number): string => {
  if (maxBytes <= 0) {
    return "";
  }

  const encoded = Buffer.from(value, "utf8");
  if (encoded.byteLength <= maxBytes) {
    return value;
  }

  return encoded.subarray(encoded.byteLength - maxBytes).toString("utf8");
};

export const appendChunkToParserBuffer = (
  currentBuffer: string,
  chunk: string,
  maxBufferBytes: number
): StreamParserBufferResult => {
  const nextBuffer = `${currentBuffer}${chunk}`;
  const trimmedBuffer = trimBufferToMaxBytes(nextBuffer, maxBufferBytes);
  const overflowed = trimmedBuffer !== nextBuffer;
  const synchronizedBuffer = overflowed
    ? (() => {
        const firstNewlineIndex = trimmedBuffer.indexOf(STREAM_PARSER_BUFFER.NEWLINE);
        if (firstNewlineIndex < 0) {
          return "";
        }
        return trimmedBuffer.slice(firstNewlineIndex + 1);
      })()
    : trimmedBuffer;

  const lines = synchronizedBuffer.split(STREAM_PARSER_BUFFER.NEWLINE);
  const remainder = lines.pop() ?? "";

  return {
    lines,
    remainder,
    overflowed,
  };
};
