import { EnvManager } from "@/utils/env/env.utils";
import * as React from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "./utils/ink-test-helpers";
import { keyboardRuntime, terminalRuntime } from "./utils/opentui-test-runtime";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_WORK_SUBDIR = process.env.TOADSTOOL_WORK_SUBDIR;

const clearWorkSubdir = (): void => {
  process.env.TOADSTOOL_WORK_SUBDIR = "";
};

const unrefStdio = (): void => {
  if (typeof process.stdin.unref === "function") {
    process.stdin.unref();
  }
  if (typeof process.stdout.unref === "function") {
    process.stdout.unref();
  }
  if (typeof process.stderr.unref === "function") {
    process.stderr.unref();
  }
};

vi.mock("@opentui/core", () => {
  const createSyntaxStyle = (): Record<string, never> => ({});

  return {
    SyntaxStyle: {
      create: createSyntaxStyle,
      fromTheme: createSyntaxStyle,
    },
    TextAttributes: {
      BOLD: 1,
      DIM: 2,
      ITALIC: 4,
      UNDERLINE: 8,
    },
  };
});

beforeEach(() => {
  process.env.NODE_ENV = "test";
  clearWorkSubdir();
  EnvManager.resetInstance();
});

vi.mock("@opentui/react", () => {
  const rendererMock = {
    suspend: vi.fn(),
    resume: vi.fn(),
    requestRender: vi.fn(),
  };

  return {
    useKeyboard: (handler: (event: { name: string }) => void): void => {
      const handlerRef = React.useRef(handler);
      handlerRef.current = handler;

      React.useEffect(() => {
        const unsubscribe = keyboardRuntime.subscribe((event) => handlerRef.current(event));
        return () => unsubscribe();
      }, []);
    },
    useTerminalDimensions: () => terminalRuntime.get(),
    useRenderer: () => rendererMock,
    createRoot: () => ({
      render: () => undefined,
    }),
  };
});

afterEach(() => {
  cleanup();
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_WORK_SUBDIR === undefined) {
    clearWorkSubdir();
  } else {
    process.env.TOADSTOOL_WORK_SUBDIR = ORIGINAL_WORK_SUBDIR;
  }
  EnvManager.resetInstance();
  if (typeof process.stdin.pause === "function") {
    process.stdin.pause();
  }
  unrefStdio();
});
