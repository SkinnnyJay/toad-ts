import React from "react";
import { describe, expect, it } from "vitest";
import { AgentIdSchema } from "../../../src/types/domain";
import { type AgentOption, AgentSelect } from "../../../src/ui/components/AgentSelect";
import { renderInk } from "../../utils/ink-test-helpers";

const agents: AgentOption[] = [
  { id: AgentIdSchema.parse("a-1"), name: "One" },
  { id: AgentIdSchema.parse("a-2"), name: "Two" },
];

describe("AgentSelect", () => {
  it("renders agents", () => {
    const { lastFrame } = renderInk(
      React.createElement(AgentSelect, {
        agents,
        onSelect: () => {},
      })
    );
    expect(lastFrame()).toContain("One");
    expect(lastFrame()).toContain("Two");
  });
});
