import { EventEmitter } from "eventemitter3";

export interface StreamLineParserEvents {
  line: (line: string) => void;
  paused: () => void;
  resumed: () => void;
}

export class StreamLineParser extends EventEmitter<StreamLineParserEvents> {
  private lineBuffer = "";
  private flushRequested = false;
  private paused = false;

  public write(chunk: Buffer | string): void {
    this.lineBuffer += chunk.toString();
    this.parseAvailableLines();
  }

  public flush(): void {
    this.flushRequested = true;
    this.parseAvailableLines();
  }

  public pause(): void {
    if (this.paused) {
      return;
    }
    this.paused = true;
    this.emit("paused");
  }

  public resume(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.emit("resumed");
    this.parseAvailableLines();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  private parseAvailableLines(): void {
    if (this.paused) {
      return;
    }

    while (!this.paused) {
      const newlineIndex = this.lineBuffer.indexOf("\n");
      if (newlineIndex < 0) {
        break;
      }

      const line = this.lineBuffer.slice(0, newlineIndex).trim();
      this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1);
      if (line.length === 0) {
        continue;
      }
      this.emit("line", line);
    }

    if (this.paused || !this.flushRequested) {
      return;
    }

    const remaining = this.lineBuffer.trim();
    this.lineBuffer = "";
    this.flushRequested = false;
    if (remaining.length > 0) {
      this.emit("line", remaining);
    }
  }
}
