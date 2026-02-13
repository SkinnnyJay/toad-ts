import { ENV_KEY } from "@/constants/env-keys";
import { UI_SYMBOLS, UI_SYMBOLS_ASCII, resolveUiSymbols } from "@/constants/ui-symbols";
import { describe, expect, it } from "vitest";

describe("resolveUiSymbols", () => {
  it("returns ascii symbols when TOADSTOOL_ASCII=true", () => {
    const symbols = resolveUiSymbols({
      [ENV_KEY.TOADSTOOL_ASCII]: "true",
    });

    expect(symbols).toEqual(UI_SYMBOLS_ASCII);
  });

  it("returns unicode symbols by default", () => {
    const symbols = resolveUiSymbols({});

    expect(symbols).toEqual(UI_SYMBOLS);
  });
});
