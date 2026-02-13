import { SERVER_CONFIG } from "@/config/server";
import { ENV_KEY } from "@/constants/env-keys";
import { resolveServerConfig } from "@/server/server-config";
import { describe, expect, it } from "vitest";

describe("resolveServerConfig", () => {
  it("returns defaults when overrides and env are absent", () => {
    const result = resolveServerConfig({}, {});

    expect(result).toEqual({
      host: SERVER_CONFIG.DEFAULT_HOST,
      port: SERVER_CONFIG.DEFAULT_PORT,
    });
  });

  it("uses env host and port when overrides are not provided", () => {
    const env = {
      [ENV_KEY.TOADSTOOL_SERVER_HOST]: "0.0.0.0",
      [ENV_KEY.TOADSTOOL_SERVER_PORT]: "5151",
    };

    const result = resolveServerConfig({}, env);

    expect(result).toEqual({
      host: "0.0.0.0",
      port: 5151,
    });
  });

  it("prefers explicit overrides over env values", () => {
    const env = {
      [ENV_KEY.TOADSTOOL_SERVER_HOST]: "0.0.0.0",
      [ENV_KEY.TOADSTOOL_SERVER_PORT]: "5151",
    };

    const result = resolveServerConfig(
      {
        host: "127.0.0.1",
        port: 4242,
      },
      env
    );

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 4242,
    });
  });

  it("falls back to default port when env port is invalid", () => {
    const env = {
      [ENV_KEY.TOADSTOOL_SERVER_PORT]: "not-a-number",
    };

    const result = resolveServerConfig({}, env);

    expect(result.port).toBe(SERVER_CONFIG.DEFAULT_PORT);
  });

  it("parses string overrides for port values", () => {
    const result = resolveServerConfig({
      port: Number.parseInt("7777", 10),
    });

    expect(result.port).toBe(7777);
  });
});
