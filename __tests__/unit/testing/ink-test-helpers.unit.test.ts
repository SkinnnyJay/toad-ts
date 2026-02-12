import { describe, expect, it } from "vitest";
import { waitFor, waitForText } from "../../utils/ink-test-helpers";

describe("ink-test-helpers", () => {
  it("waitFor resolves when condition becomes true", async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 10);

    await expect(waitFor(() => ready, 200, 10)).resolves.toBeUndefined();
  });

  it("waitFor rejects when condition never becomes true", async () => {
    await expect(waitFor(() => false, 40, 10)).rejects.toThrow(
      "waitFor timed out after 40ms. Condition never became true."
    );
  });

  it("waitForText resolves when frame includes requested text", async () => {
    let frame = "loading";
    setTimeout(() => {
      frame = "ready";
    }, 10);

    await expect(waitForText({ lastFrame: () => frame }, "ready", 200)).resolves.toBeUndefined();
  });
});
