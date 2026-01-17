import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AgentIdSchema } from "../../../src/types/domain";
import { type AgentOption, AgentSelect } from "../../../src/ui/components/AgentSelect";
import { flush, renderInk, waitFor } from "../../utils/ink-test-helpers";

const agents: AgentOption[] = [
  { id: AgentIdSchema.parse("a-1"), name: "One", status: "ready" },
  { id: AgentIdSchema.parse("a-2"), name: "Two", status: "loading" },
  { id: AgentIdSchema.parse("a-3"), name: "Three", status: "error" },
];

describe("AgentSelect", () => {
  it("renders agents in grid with status", () => {
    const { lastFrame } = renderInk(
      React.createElement(AgentSelect, {
        agents,
        onSelect: () => {},
      })
    );
    const frame = lastFrame();
    expect(frame).toContain("1.");
    expect(frame).toContain("2.");
    expect(frame).toContain("3.");
    expect(frame).toContain("ready");
    expect(frame).toContain("loading");
    expect(frame).toContain("error");
  });
});
