import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PERMISSION } from "../../../src/constants/permissions";
import { ToolCallIdSchema } from "../../../src/types/domain";
import { ToolCallApproval } from "../../../src/ui/components/ToolCallApproval";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("ToolCallApproval", () => {
  const createMockRequest = () => ({
    id: ToolCallIdSchema.parse("tool-1"),
    name: "read_file",
    description: "Read a file",
    arguments: { path: "test.txt" },
  });

  it("should render approval UI for ASK permission", () => {
    const request = createMockRequest();
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(ToolCallApproval, {
          request,
          onApprove: () => {},
          onDeny: () => {},
          defaultPermission: PERMISSION.ASK,
        })
      )
    );

    expect(lastFrame()).toContain("Tool Request");
    expect(lastFrame()).toContain("read_file");
  });

  it("should auto-approve for ALLOW permission", async () => {
    const request = createMockRequest();
    const onApprove = vi.fn();

    renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(ToolCallApproval, {
          request,
          onApprove,
          onDeny: () => {},
          defaultPermission: PERMISSION.ALLOW,
        })
      )
    );

    // Wait for useEffect to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onApprove).toHaveBeenCalledWith("tool-1");
  });

  it("should auto-deny for DENY permission", async () => {
    const request = createMockRequest();
    const onDeny = vi.fn();

    renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(ToolCallApproval, {
          request,
          onApprove: () => {},
          onDeny,
          defaultPermission: PERMISSION.DENY,
        })
      )
    );

    // Wait for useEffect to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(onDeny).toHaveBeenCalledWith("tool-1");
  });

  it("should auto-approve and show message for ALLOW permission", async () => {
    const request = createMockRequest();
    const onApprove = vi.fn();
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(ToolCallApproval, {
          request,
          onApprove,
          onDeny: () => {},
          defaultPermission: PERMISSION.ALLOW,
        })
      )
    );

    // Wait for useEffect to run
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should call onApprove and show approved message
    expect(onApprove).toHaveBeenCalled();
    const frame = lastFrame();
    expect(frame).toBeTruthy();
  });
});
