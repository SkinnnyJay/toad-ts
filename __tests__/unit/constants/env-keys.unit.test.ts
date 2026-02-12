import { ENV_KEY, TOADSTOOL_SERVER_PASSWORD } from "@/constants/env-keys";
import { describe, expect, it } from "vitest";

describe("env-keys constants", () => {
  it("exposes server password env key in map and re-export", () => {
    expect(ENV_KEY.TOADSTOOL_SERVER_PASSWORD).toBe("TOADSTOOL_SERVER_PASSWORD");
    expect(TOADSTOOL_SERVER_PASSWORD).toBe(ENV_KEY.TOADSTOOL_SERVER_PASSWORD);
  });
});
