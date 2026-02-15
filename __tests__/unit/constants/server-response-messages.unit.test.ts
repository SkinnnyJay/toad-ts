import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { describe, expect, it } from "vitest";

describe("server-response-messages constants", () => {
  it("exports canonical API and auth response messages", () => {
    expect(SERVER_RESPONSE_MESSAGE).toMatchObject({
      METHOD_NOT_ALLOWED: "Method not allowed",
      REQUEST_BODY_TOO_LARGE: "Request body too large.",
      INVALID_REQUEST: "Invalid request.",
      UNKNOWN_ENDPOINT: "Unknown endpoint.",
      INVALID_SESSION_ID: "Invalid session id.",
      SESSION_NOT_FOUND: "Session not found.",
      NOT_FOUND: "Not found.",
      SERVER_ERROR: "Server error.",
      SESSION_ID_REQUIRED: "Session ID required",
      QUERY_PARAM_Q_REQUIRED: "Query parameter 'q' required",
      TEXT_REQUIRED: "Text required",
      COMMAND_REQUIRED: "Command required",
      FAILED_TO_LOAD_CONFIG: "Failed to load config",
      FAILED_TO_LOAD_HARNESSES: "Failed to load harnesses",
      AUTHORIZATION_REQUIRED: "Authorization required",
      INVALID_CREDENTIALS: "Invalid credentials",
    });
  });
});
