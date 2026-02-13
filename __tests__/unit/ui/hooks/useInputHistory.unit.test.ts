import { INPUT_HISTORY_MAX_SIZE } from "@/config/limits";
import { useInputHistory } from "@/ui/hooks/useInputHistory";
import React, { useEffect } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

type InputHistoryApi = ReturnType<typeof useInputHistory>;

interface InputHistoryProbeProps {
  onApi: (api: InputHistoryApi) => void;
}

const InputHistoryProbe = ({ onApi }: InputHistoryProbeProps): React.JSX.Element => {
  const api = useInputHistory();
  useEffect(() => {
    onApi(api);
  }, [api, onApi]);
  return React.createElement(React.Fragment);
};

const createHarness = (): {
  call: {
    (selector: (api: InputHistoryApi) => void): void;
    <T>(selector: (api: InputHistoryApi) => T): T;
  };
  getApi: () => InputHistoryApi;
  unmount: () => void;
} => {
  let api: InputHistoryApi | undefined;
  let renderer: ReactTestRenderer;

  act(() => {
    renderer = create(
      React.createElement(InputHistoryProbe, {
        onApi: (nextApi) => {
          api = nextApi;
        },
      })
    );
  });

  const getApi = (): InputHistoryApi => {
    if (!api) {
      throw new Error("Expected input history hook API to be initialized.");
    }
    return api;
  };

  const call = <T>(selector: (hookApi: InputHistoryApi) => T): T => {
    let result!: T;
    act(() => {
      result = selector(getApi());
    });
    return result;
  };

  return {
    call,
    getApi,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe("useInputHistory", () => {
  it("deduplicates entries and enforces max history size", () => {
    const harness = createHarness();
    try {
      harness.call((api) => api.add("first"));
      harness.call((api) => api.add("first"));
      harness.call((api) => api.add(" "));
      expect(harness.getApi().historySize).toBe(1);

      for (let index = 0; index < INPUT_HISTORY_MAX_SIZE + 10; index += 1) {
        harness.call((api) => api.add(`entry-${index}`));
      }

      expect(harness.getApi().historySize).toBe(INPUT_HISTORY_MAX_SIZE);
    } finally {
      harness.unmount();
    }
  });

  it("navigates history up and down with expected boundaries", () => {
    const harness = createHarness();
    try {
      harness.call((api) => api.add("one"));
      harness.call((api) => api.add("two"));
      harness.call((api) => api.add("three"));

      expect(harness.call((api) => api.navigateUp())).toBe("three");
      expect(harness.call((api) => api.navigateUp())).toBe("two");
      expect(harness.call((api) => api.navigateUp())).toBe("one");
      expect(harness.call((api) => api.navigateUp())).toBe("one");

      expect(harness.call((api) => api.navigateDown())).toBe("two");
      expect(harness.call((api) => api.navigateDown())).toBe("three");
      expect(harness.call((api) => api.navigateDown())).toBe("");
      expect(harness.call((api) => api.navigateDown())).toBeNull();
    } finally {
      harness.unmount();
    }
  });

  it("supports reverse search filtering and result cycling", () => {
    const harness = createHarness();
    try {
      harness.call((api) => api.add("fix lint issue"));
      harness.call((api) => api.add("write tests"));
      harness.call((api) => api.add("fix type error"));

      harness.call((api) => api.startSearch());
      expect(harness.getApi().searchMode).toBe(true);
      expect(harness.getApi().searchResults).toEqual([
        "fix type error",
        "write tests",
        "fix lint issue",
      ]);

      harness.call((api) => api.updateSearch("fix"));
      expect(harness.getApi().searchResults).toEqual(["fix type error", "fix lint issue"]);

      expect(harness.call((api) => api.nextSearchResult())).toBe("fix lint issue");
      expect(harness.call((api) => api.nextSearchResult())).toBe("fix type error");

      expect(harness.call((api) => api.acceptSearch())).toBe("fix type error");
      expect(harness.getApi().searchMode).toBe(false);
    } finally {
      harness.unmount();
    }
  });
});
