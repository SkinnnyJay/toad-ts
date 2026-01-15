import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import type { ConnectionStatus } from "@/types/domain";
import { type Stream, ndJsonStream } from "@agentclientprotocol/sdk";
import { EventEmitter } from "eventemitter3";

export interface ACPConnectionOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  backoffBaseMs?: number;
  backoffCapMs?: number;
}

export interface ACPConnectionEvents {
  state: (status: ConnectionStatus) => void;
  data: (chunk: string) => void;
  error: (error: Error) => void;
  exit: (info: { code: number | null; signal: NodeJS.Signals | null }) => void;
}

export type SpawnFunction = (
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  }
) => ChildProcessWithoutNullStreams;

const DEFAULT_BACKOFF_BASE_MS = 250;
const DEFAULT_BACKOFF_CAP_MS = 5_000;

export class ACPConnection extends EventEmitter<ACPConnectionEvents> {
  private status: ConnectionStatus = "disconnected";
  private child?: ChildProcessWithoutNullStreams;
  private stream?: Stream;
  private attempt = 0;
  private readonly spawnFn: SpawnFunction;
  private readonly backoffBaseMs: number;
  private readonly backoffCapMs: number;

  constructor(
    private readonly options: ACPConnectionOptions,
    spawnFn?: SpawnFunction
  ) {
    super();
    this.spawnFn = spawnFn ?? spawn;
    this.backoffBaseMs = options.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
    this.backoffCapMs = options.backoffCapMs ?? DEFAULT_BACKOFF_CAP_MS;
  }

  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  getStream(): Stream | undefined {
    return this.stream;
  }

  async connect(): Promise<void> {
    if (this.status === "connecting" || this.status === "connected") {
      return;
    }
    this.setStatus("connecting");
    this.attempt += 1;

    try {
      const child = this.spawnFn(this.options.command, this.options.args ?? [], {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
      });
      this.child = child;

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => this.emit("data", chunk));
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => this.emit("data", chunk));

      const input = Writable.toWeb(child.stdin);
      const output = Readable.toWeb(child.stdout);
      this.stream = ndJsonStream(input, output);

      child.on("error", (error) => {
        this.emit("error", error);
        this.setStatus("error");
      });

      child.on("close", (code, signal) => {
        this.emit("exit", { code, signal });
        this.child = undefined;
        this.stream = undefined;
        this.setStatus("disconnected");
      });

      this.setStatus("connected");
      this.attempt = 0;
    } catch (error) {
      this.setStatus("error");
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  async disconnect(): Promise<void> {
    if (!this.child) {
      this.setStatus("disconnected");
      return;
    }
    await new Promise<void>((resolve) => {
      this.child?.once("close", () => resolve());
      this.child?.kill("SIGTERM");
      setTimeout(() => {
        if (this.child?.kill) {
          this.child.kill("SIGKILL");
        }
        resolve();
      }, 500).unref();
    });
    this.child = undefined;
    this.stream = undefined;
    this.setStatus("disconnected");
  }

  scheduleReconnect(): number {
    const delay = this.calculateBackoff(this.attempt + 1);
    setTimeout(() => {
      void this.connect();
    }, delay).unref();
    return delay;
  }

  calculateBackoff(attempt: number): number {
    const raw = this.backoffBaseMs * 2 ** (attempt - 1);
    return Math.min(raw, this.backoffCapMs);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit("state", status);
  }
}
