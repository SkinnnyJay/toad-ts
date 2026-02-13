import {
  BASE_SCALE,
  DURATION_MS,
  FADE_STEPS,
  MODAL_ANIMATION,
  SCALE_DELTA,
} from "@/constants/modal-animation";
import { describe, expect, it } from "vitest";

describe("modal-animation constants", () => {
  it("exports canonical timing and scale values", () => {
    expect(MODAL_ANIMATION.DURATION_MS).toBe(150);
    expect(MODAL_ANIMATION.FADE_STEPS).toBe(8);
    expect(MODAL_ANIMATION.BASE_SCALE).toBe(0.95);
    expect(MODAL_ANIMATION.SCALE_DELTA).toBe(0.05);
  });

  it("re-exports convenience aliases", () => {
    expect(DURATION_MS).toBe(MODAL_ANIMATION.DURATION_MS);
    expect(FADE_STEPS).toBe(MODAL_ANIMATION.FADE_STEPS);
    expect(BASE_SCALE).toBe(MODAL_ANIMATION.BASE_SCALE);
    expect(SCALE_DELTA).toBe(MODAL_ANIMATION.SCALE_DELTA);
  });
});
