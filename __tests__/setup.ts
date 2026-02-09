import * as React from "react";
import { vi } from "vitest";
import { keyboardRuntime, terminalRuntime } from "./utils/opentui-test-runtime";

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

vi.mock("@opentui/react", () => {
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
    createRoot: () => ({
      render: () => undefined,
    }),
  };
});
