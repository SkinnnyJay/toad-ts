import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { PassThrough } from "node:stream";
import { EventEmitter } from "eventemitter3";
import { describe, expect, it, vi } from "vitest";
import { ACPConnection } from "../../../src/core/acp-connection";

const createMockChild = (): ChildProcessWithoutNullStreams => {
  const emitter = new EventEmitter();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  const child = Object.assign(emitter, {
    stdout,
    stderr,
    stdin,
    kill: vi.fn(),
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
  });

  return child as unknown as ChildProcessWithoutNullStreams;
};

describe("ACPConnection", () => {
  it("emits state changes and data", async () => {
    const child = createMockChild();
    const spawnFn = vi.fn().mockReturnValue(child);
    const connection = new ACPConnection({ command: "echo" }, spawnFn);
    const states: string[] = [];
    connection.on("state", (s) => states.push(s));

    await connection.connect();
    child.stdout.emit("data", "hello");
    child.emit("close", 0, null);

    expect(states).toEqual(["connecting", "connected", "disconnected"]);
    expect(spawnFn).toHaveBeenCalled();
  });

  it("calculates backoff with cap", () => {
    const connection = new ACPConnection({
      command: "echo",
      backoffBaseMs: 100,
      backoffCapMs: 500,
    });
    expect(connection.calculateBackoff(1)).toBe(100);
    expect(connection.calculateBackoff(3)).toBe(400);
    expect(connection.calculateBackoff(5)).toBe(500);
  });
});
