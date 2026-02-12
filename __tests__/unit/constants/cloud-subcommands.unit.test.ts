import { CLOUD_SUBCOMMAND } from "@/constants/cloud-subcommands";
import { describe, expect, it } from "vitest";

describe("cloud subcommands constants", () => {
  it("defines canonical cloud command subcommand names", () => {
    expect(CLOUD_SUBCOMMAND).toEqual({
      LIST: "list",
      STATUS: "status",
      STOP: "stop",
      FOLLOWUP: "followup",
      DISPATCH: "dispatch",
    });
  });
});
