import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import {
  REQUEST_PARSING_SOURCE,
  classifyRequestParsingError,
  logRequestParsingFailure,
  logRequestValidationFailure,
  normalizeRequestBodyParseError,
  normalizeRequestBodyParseErrorDetails,
} from "@/server/request-error-normalization";
import { describe, expect, it, vi } from "vitest";

const UNKNOWN_ERROR_MESSAGE = "unexpected failure";
const TOO_LARGE_MESSAGE = SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE;
const INVALID_MESSAGE = SERVER_RESPONSE_MESSAGE.INVALID_REQUEST;
const PADDED_TOO_LARGE_MESSAGE = ` ${TOO_LARGE_MESSAGE} `;
const PADDED_INVALID_MESSAGE = ` ${INVALID_MESSAGE} `;
const UPPERCASE_TOO_LARGE_MESSAGE = TOO_LARGE_MESSAGE.toUpperCase();
const UPPERCASE_INVALID_MESSAGE = INVALID_MESSAGE.toUpperCase();
const TOO_LARGE_MESSAGE_WITHOUT_PERIOD = TOO_LARGE_MESSAGE.replace(/\.$/, "");
const INVALID_MESSAGE_WITHOUT_PERIOD = INVALID_MESSAGE.replace(/\.$/, "");

describe("request-error-normalization", () => {
  it("classifies request body too large errors", () => {
    const error = new Error(TOO_LARGE_MESSAGE);

    expect(classifyRequestParsingError(error)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large message strings", () => {
    expect(classifyRequestParsingError(TOO_LARGE_MESSAGE)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large message strings with padding", () => {
    expect(classifyRequestParsingError(PADDED_TOO_LARGE_MESSAGE)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large messages case-insensitively", () => {
    expect(classifyRequestParsingError(UPPERCASE_TOO_LARGE_MESSAGE)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies request body too large messages without terminal punctuation", () => {
    expect(classifyRequestParsingError(TOO_LARGE_MESSAGE_WITHOUT_PERIOD)).toBe(TOO_LARGE_MESSAGE);
  });

  it("classifies syntax errors as invalid requests", () => {
    const error = new SyntaxError("Unexpected token");

    expect(classifyRequestParsingError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("classifies canonical invalid-request errors", () => {
    const error = new Error(INVALID_MESSAGE);

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies canonical invalid-request message objects", () => {
    const error = {
      message: INVALID_MESSAGE,
    };

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies padded invalid-request message objects", () => {
    const error = {
      message: PADDED_INVALID_MESSAGE,
    };

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies case-variant invalid-request message objects", () => {
    const error = {
      message: UPPERCASE_INVALID_MESSAGE,
    };

    expect(classifyRequestParsingError(error)).toBe(INVALID_MESSAGE);
  });

  it("classifies invalid-request message strings without terminal punctuation", () => {
    expect(classifyRequestParsingError(INVALID_MESSAGE_WITHOUT_PERIOD)).toBe(INVALID_MESSAGE);
  });

  it("returns null for unrecognized errors", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(classifyRequestParsingError(error)).toBeNull();
  });

  it("normalizes unknown parse errors to invalid request", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(normalizeRequestBodyParseError(error)).toBe(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  });

  it("returns normalized parse error details", () => {
    const error = new Error(UNKNOWN_ERROR_MESSAGE);

    expect(normalizeRequestBodyParseErrorDetails(error)).toEqual({
      message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("returns normalized parse error details for message-only objects", () => {
    const error = {
      message: UNKNOWN_ERROR_MESSAGE,
    };

    expect(normalizeRequestBodyParseErrorDetails(error)).toEqual({
      message: INVALID_MESSAGE,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("returns normalized parse error details for numeric object messages", () => {
    const error = {
      message: 503,
    };

    expect(normalizeRequestBodyParseErrorDetails(error)).toEqual({
      message: INVALID_MESSAGE,
      error: "503",
    });
  });

  it("logs normalized parsing metadata with standardized keys", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: " post ",
        pathname: " /api/tui/append-prompt?preview=true ",
        handler: " append_prompt ",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/api/tui/append-prompt",
      handler: "append_prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("omits blank handler metadata when handler is whitespace", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: "post",
        pathname: "/api/tui/append-prompt",
        handler: "   ",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/api/tui/append-prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("logs normalized validation metadata with standardized keys", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: " post ",
        pathname: " / ",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      method: "POST",
      pathname: "/",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("falls back to root pathname when logging blank request path", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HEADLESS_SERVER,
        method: " get ",
        pathname: "   ",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.HEADLESS_SERVER,
      method: "GET",
      pathname: "/",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("normalizes suffix-only request paths to root in parsing logs", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: "post",
        pathname: " #summary ",
        handler: "append_prompt",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/",
      handler: "append_prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("normalizes suffix-only request paths to root in validation logs", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: "get",
        pathname: " ?scope=all ",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      method: "GET",
      pathname: "/",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("falls back to unknown method when logging blank request method", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: "   ",
        pathname: "/api/tui/append-prompt",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "UNKNOWN",
      pathname: "/api/tui/append-prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("normalizes query/hash suffixes when logging validation pathnames", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HOOK_IPC,
        method: "get",
        pathname: " /api/config#summary?view=compact ",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HOOK_IPC,
      method: "GET",
      pathname: "/api/config",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("preserves malformed inner separators when logging validation pathnames", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestValidationFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.HEADLESS_SERVER,
        method: " get ",
        pathname: " /sessions//prompt/#summary?tail=1 ",
      },
      {
        mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request validation failed", {
      source: REQUEST_PARSING_SOURCE.HEADLESS_SERVER,
      method: "GET",
      pathname: "/sessions//prompt",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("normalizes combined trailing-slash suffixes when logging parsing pathnames", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: " post ",
        pathname: " /api/config/#summary?view=compact ",
        handler: " config_route ",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/api/config",
      handler: "config_route",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });

  it("preserves malformed inner separators when logging parsing pathnames", () => {
    const warn = vi.fn();
    const logger = { warn } as {
      warn: (message: string, metadata?: Record<string, unknown>) => void;
    };

    logRequestParsingFailure(
      logger,
      {
        source: REQUEST_PARSING_SOURCE.API_ROUTES,
        method: " post ",
        pathname: " /api/sessions//messages/#summary?scope=all ",
        handler: " api_route_classifier ",
      },
      {
        message: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
        error: UNKNOWN_ERROR_MESSAGE,
      }
    );

    expect(warn).toHaveBeenCalledWith("Request parsing failed", {
      source: REQUEST_PARSING_SOURCE.API_ROUTES,
      method: "POST",
      pathname: "/api/sessions//messages",
      handler: "api_route_classifier",
      mappedMessage: SERVER_RESPONSE_MESSAGE.INVALID_REQUEST,
      error: UNKNOWN_ERROR_MESSAGE,
    });
  });
});
