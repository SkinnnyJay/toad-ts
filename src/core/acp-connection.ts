import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { ENCODING } from "@/constants/encodings";
import { FALLBACK } from "@/constants/fallbacks";
import type { ConnectionStatus } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
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

const DEFAULT_BACKOFF_BASE_MS = TIMEOUT.BACKOFF_BASE_MS;
const DEFAULT_BACKOFF_CAP_MS = TIMEOUT.BACKOFF_CAP_MS;

export class ACPConnection extends EventEmitter<ACPConnectionEvents> {
  private status: ConnectionStatus = CONNECTION_STATUS.DISCONNECTED;
  private child?: ChildProcessWithoutNullStreams;
  private stream?: Stream;
  private attempt = 0;
  private isDisconnecting = false;
  private readonly stderrLines: string[] = [];
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
    if (
      this.status === CONNECTION_STATUS.CONNECTING ||
      this.status === CONNECTION_STATUS.CONNECTED
    ) {
      return;
    }
    this.isDisconnecting = false;
    this.setStatus(CONNECTION_STATUS.CONNECTING);
    this.attempt += 1;

    try {
      this.stderrLines.length = 0;
      const child = this.spawnFn(this.options.command, this.options.args ?? [], {
        cwd: this.options.cwd,
        env: { ...EnvManager.getInstance().getSnapshot(), ...this.options.env },
      });
      this.child = child;

      // Don't set encoding or add listeners before converting to Web streams
      // as this can interfere with the stream conversion

      child.stderr.setEncoding(ENCODING.UTF8);
      child.stderr.on("data", (chunk: string) => {
        this.emit("data", chunk);
        this.captureStderr(chunk);
      });

      const input = Writable.toWeb(child.stdin);
      const outputReader = Readable.toWeb(child.stdout).getReader();
      const output = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const result = await outputReader.read();
          if (result.done) {
            controller.close();
            return;
          }
          if (result.value) {
            controller.enqueue(result.value);
          }
        },
        cancel(reason) {
          void outputReader.cancel(reason);
        },
      });
      this.stream = ndJsonStream(input, output);

      child.on("error", (error) => {
        this.emit("error", error);
        this.setStatus(CONNECTION_STATUS.ERROR);
      });

      child.on("close", (code, signal) => {
        const wasDisconnecting = this.isDisconnecting;
        this.isDisconnecting = false;
        this.emit("exit", { code, signal });
        this.child = undefined;
        this.stream = undefined;

        const hasError = !wasDisconnecting && ((code !== null && code !== 0) || signal !== null);
        if (hasError) {
          this.emit("error", this.formatExitError(code, signal));
          this.setStatus(CONNECTION_STATUS.ERROR);
        } else {
          this.setStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      });

      this.setStatus(CONNECTION_STATUS.CONNECTED);
      this.attempt = 0;
    } catch (error) {
      this.setStatus(CONNECTION_STATUS.ERROR);
      this.emit("error", error instanceof Error ? error : new Error(String(error)));
    }
  }

  async disconnect(): Promise<void> {
    if (!this.child) {
      this.setStatus(CONNECTION_STATUS.DISCONNECTED);
      return;
    }
    this.isDisconnecting = true;
    await new Promise<void>((resolve) => {
      this.child?.once("close", () => resolve());
      this.child?.kill("SIGTERM");
      setTimeout(() => {
        if (this.child?.kill) {
          this.child.kill("SIGKILL");
        }
        resolve();
      }, TIMEOUT.DISCONNECT_FORCE_MS).unref();
    });
    this.child = undefined;
    this.stream = undefined;
    this.isDisconnecting = false;
    this.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  scheduleReconnect(): number {
    const delay = this.calculateBackoff(this.attempt + 1);
    setTimeout(() => {
      void this.connect();
    }, delay).unref();
    return delay;
  }

  calculateBackoff(attempt: number): number {
    const raw = this.backoffBaseMs * LIMIT.RETRY_EXPONENTIAL_BASE ** (attempt - 1);
    return Math.min(raw, this.backoffCapMs);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit("state", status);
  }

  private captureStderr(chunk: string): void {
    const lines = chunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return;
    }
    this.stderrLines.push(...lines);
    if (this.stderrLines.length > LIMIT.STDERR_LINES) {
      this.stderrLines.splice(0, this.stderrLines.length - LIMIT.STDERR_LINES);
    }
  }

  private formatExitError(code: number | null, signal: NodeJS.Signals | null): Error {
    const suffix = signal ? ` (signal ${signal})` : "";
    const stderrOutput = this.stderrLines.join("\n");
    const details = stderrOutput ? `\n${stderrOutput}` : "";
    return new Error(
      `Agent process exited with code ${code ?? FALLBACK.UNKNOWN}${suffix}${details}`
    );
  }
}
