import { BASE_SCALE, DURATION_MS, SCALE_DELTA } from "@/constants/modal-animation";
import { useModalAnimation } from "@/ui/hooks/useModalAnimation";
import React, { useEffect } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface ModalSnapshot {
  visible: boolean;
  opacity: number;
  scale: number;
  animating: boolean;
}

interface ModalAnimationProbeProps {
  isOpen: boolean;
  onSnapshot: (snapshot: ModalSnapshot) => void;
}

const ANIMATION_SETTLE_MS = DURATION_MS * 2;

const ModalAnimationProbe = ({
  isOpen,
  onSnapshot,
}: ModalAnimationProbeProps): React.JSX.Element => {
  const { visible, opacity, scale, animating } = useModalAnimation(isOpen);

  useEffect(() => {
    onSnapshot({ visible, opacity, scale, animating });
  }, [visible, opacity, scale, animating, onSnapshot]);

  return React.createElement(React.Fragment);
};

const getLastSnapshot = (snapshots: ModalSnapshot[]): ModalSnapshot => {
  const snapshot = snapshots.at(-1);
  if (!snapshot) {
    throw new Error("Expected at least one modal snapshot.");
  }
  return snapshot;
};

describe("useModalAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("animates open transition and settles at full opacity", () => {
    const snapshots: ModalSnapshot[] = [];
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        React.createElement(ModalAnimationProbe, {
          isOpen: false,
          onSnapshot: (snapshot) => snapshots.push(snapshot),
        })
      );
    });

    act(() => {
      renderer.update(
        React.createElement(ModalAnimationProbe, {
          isOpen: true,
          onSnapshot: (snapshot) => snapshots.push(snapshot),
        })
      );
    });

    act(() => {
      vi.advanceTimersByTime(ANIMATION_SETTLE_MS);
    });

    const settled = getLastSnapshot(snapshots);
    expect(settled.visible).toBe(true);
    expect(settled.animating).toBe(false);
    expect(settled.opacity).toBeCloseTo(1, 3);
    expect(settled.scale).toBeCloseTo(BASE_SCALE + SCALE_DELTA, 3);
  });

  it("animates close transition and hides modal when complete", () => {
    const snapshots: ModalSnapshot[] = [];
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(
        React.createElement(ModalAnimationProbe, {
          isOpen: true,
          onSnapshot: (snapshot) => snapshots.push(snapshot),
        })
      );
    });

    act(() => {
      vi.advanceTimersByTime(ANIMATION_SETTLE_MS);
    });

    act(() => {
      renderer.update(
        React.createElement(ModalAnimationProbe, {
          isOpen: false,
          onSnapshot: (snapshot) => snapshots.push(snapshot),
        })
      );
    });

    act(() => {
      vi.advanceTimersByTime(ANIMATION_SETTLE_MS);
    });

    const settled = getLastSnapshot(snapshots);
    expect(settled.visible).toBe(false);
    expect(settled.animating).toBe(false);
    expect(settled.opacity).toBe(0);
    expect(settled.scale).toBe(BASE_SCALE);
  });
});
