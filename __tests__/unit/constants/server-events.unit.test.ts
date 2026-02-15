import { SERVER_EVENT } from "@/constants/server-events";
import { describe, expect, it } from "vitest";

describe("server event constants", () => {
  it("exports all supported server event types", () => {
    expect(SERVER_EVENT).toEqual({
      SESSION_CREATED: "session_created",
      SESSION_UPDATE: "session_update",
      SESSION_CLOSED: "session_closed",
      STATE_UPDATE: "state_update",
    });
  });
});
