import { StreamLineParser } from "@/core/cli-agent/stream-line-parser";
import { describe, expect, it } from "vitest";

describe("StreamLineParser", () => {
  it("emits complete lines across chunk boundaries", () => {
    const parser = new StreamLineParser();
    const lines: string[] = [];
    parser.on("line", (line) => lines.push(line));

    parser.write("alpha\nbe");
    parser.write("ta\n");
    parser.flush();

    expect(lines).toEqual(["alpha", "beta"]);
  });

  it("flushes trailing non-newline content", () => {
    const parser = new StreamLineParser();
    const lines: string[] = [];
    parser.on("line", (line) => lines.push(line));

    parser.write("tail-without-newline");
    parser.flush();

    expect(lines).toEqual(["tail-without-newline"]);
  });

  it("pauses and resumes line emission", () => {
    const parser = new StreamLineParser();
    const lines: string[] = [];
    parser.on("line", (line) => lines.push(line));

    parser.pause();
    parser.write("first\nsecond\n");
    expect(lines).toEqual([]);

    parser.resume();
    expect(lines).toEqual(["first", "second"]);
  });
});
