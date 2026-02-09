import { LOG_LEVEL, type LogLevel } from "@/constants/log-level";
import { getCorrelationContext } from "./correlation-context";

export type LogMetadata = Readonly<Record<string, unknown>>;

export interface Logger {
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
}

export type Log = Logger;

let isMockLoggerEnabled = false;

export function enableMockLogger(): void {
  isMockLoggerEnabled = true;
}

export function disableMockLogger(): void {
  isMockLoggerEnabled = false;
}

function writeLogLine(
  level: LogLevel,
  name: string,
  message: string,
  metadata?: LogMetadata
): void {
  if (isMockLoggerEnabled) {
    return;
  }

  const correlationContext = getCorrelationContext();
  const mergedMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
    ...(correlationContext ? { correlationContext } : {}),
  };

  const payload: Record<string, unknown> = Object.keys(mergedMetadata).length
    ? { name, ...mergedMetadata }
    : { name };

  const line: string = `${message} ${JSON.stringify(payload)}`;

  if (level === LOG_LEVEL.ERROR) {
    process.stderr.write(`[${level}] ${line}\n`);
    return;
  }

  process.stdout.write(`[${level}] ${line}\n`);
}

export function createClassLogger(className: string): Logger {
  return {
    info: (message: string, metadata?: LogMetadata): void =>
      writeLogLine(LOG_LEVEL.INFO, className, message, metadata),
    warn: (message: string, metadata?: LogMetadata): void =>
      writeLogLine(LOG_LEVEL.WARN, className, message, metadata),
    debug: (message: string, metadata?: LogMetadata): void =>
      writeLogLine(LOG_LEVEL.DEBUG, className, message, metadata),
    error: (message: string, metadata?: LogMetadata): void =>
      writeLogLine(LOG_LEVEL.ERROR, className, message, metadata),
  };
}

export function logTable(
  logger: Logger,
  level: "info" | "warn" | "debug",
  label: string,
  rows: readonly unknown[]
): void {
  logger[level](label, { table: rows });
  if (typeof console !== "undefined" && typeof console.table === "function") {
    console.table(rows);
  }
}

export function logExecutorEvent(logger: Logger, message: string, metadata?: LogMetadata): void {
  logger.info(message, metadata);
}

export function logLLMEvent(logger: Logger, message: string, metadata?: LogMetadata): void {
  logger.info(message, metadata);
}

export class LoggerSingleton {
  private static instance: LoggerSingleton | null = null;
  private readonly baseLogger: Logger;

  private constructor() {
    this.baseLogger = createClassLogger("Logger");
  }

  public static getInstance(): LoggerSingleton {
    if (LoggerSingleton.instance) {
      return LoggerSingleton.instance;
    }
    LoggerSingleton.instance = new LoggerSingleton();
    return LoggerSingleton.instance;
  }

  public getLogger(context: string): Logger {
    return createClassLogger(context);
  }

  public static resetInstance(): void {
    LoggerSingleton.instance = null;
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.baseLogger.info(message, metadata);
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.baseLogger.warn(message, metadata);
  }

  public debug(message: string, metadata?: LogMetadata): void {
    this.baseLogger.debug(message, metadata);
  }

  public error(message: string, metadata?: LogMetadata): void {
    this.baseLogger.error(message, metadata);
  }
}

export const LoggerInstance = LoggerSingleton;
export const LogInstance: Logger = createClassLogger("Log");
