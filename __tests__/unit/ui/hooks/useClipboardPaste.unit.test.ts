import { type ImageAttachment, isImageFile, loadImageAsBase64 } from "@/core/image-support";
import { type ClipboardPasteResult, useClipboardPaste } from "@/ui/hooks/useClipboardPaste";
import React, { useEffect } from "react";
import { type ReactTestRenderer, act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/image-support", () => ({
  isImageFile: vi.fn(),
  loadImageAsBase64: vi.fn(),
}));

interface ClipboardPasteProbeProps {
  onReady: (handler: (text: string) => Promise<ClipboardPasteResult>) => void;
}

const ClipboardPasteProbe = ({ onReady }: ClipboardPasteProbeProps): React.JSX.Element => {
  const { handlePaste } = useClipboardPaste();
  useEffect(() => {
    onReady(handlePaste);
  }, [handlePaste, onReady]);
  return React.createElement(React.Fragment);
};

const createHarness = (): {
  runPaste: (pastedText: string) => Promise<ClipboardPasteResult>;
  unmount: () => void;
} => {
  let handlePaste: ((text: string) => Promise<ClipboardPasteResult>) | undefined;
  let renderer: ReactTestRenderer;

  act(() => {
    renderer = create(
      React.createElement(ClipboardPasteProbe, {
        onReady: (handler) => {
          handlePaste = handler;
        },
      })
    );
  });

  const runPaste = async (pastedText: string): Promise<ClipboardPasteResult> => {
    let result: ClipboardPasteResult | undefined;
    await act(async () => {
      if (!handlePaste) {
        throw new Error("Expected clipboard paste handler to be initialized.");
      }
      result = await handlePaste(pastedText);
    });
    if (!result) {
      throw new Error("Expected clipboard paste result.");
    }
    return result;
  };

  return {
    runPaste,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
};

describe("useClipboardPaste", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns plain text for non-image paste", async () => {
    const isImageFileMock = vi.mocked(isImageFile);
    const loadImageAsBase64Mock = vi.mocked(loadImageAsBase64);
    isImageFileMock.mockReturnValue(false);
    vi.spyOn(Date, "now").mockReturnValue(1_000);

    const harness = createHarness();
    try {
      const result = await harness.runPaste("hello world");
      expect(result).toEqual({ text: "hello world", image: null });
      expect(isImageFileMock).toHaveBeenCalledWith("hello world");
      expect(loadImageAsBase64Mock).not.toHaveBeenCalled();
    } finally {
      harness.unmount();
    }
  });

  it("converts image path paste into an image attachment", async () => {
    const isImageFileMock = vi.mocked(isImageFile);
    const loadImageAsBase64Mock = vi.mocked(loadImageAsBase64);
    isImageFileMock.mockReturnValue(true);
    vi.spyOn(Date, "now").mockReturnValue(2_000);

    const attachment: ImageAttachment = {
      fileName: "diagram.png",
      mimeType: "image/png",
      base64: "abc123",
      sizeBytes: 123,
    };
    loadImageAsBase64Mock.mockResolvedValue(attachment);

    const harness = createHarness();
    try {
      const result = await harness.runPaste(" /tmp/diagram.png ");
      expect(loadImageAsBase64Mock).toHaveBeenCalledWith("/tmp/diagram.png");
      expect(result).toEqual({
        text: "[Image: diagram.png]",
        image: attachment,
      });
    } finally {
      harness.unmount();
    }
  });

  it("debounces rapid consecutive paste events", async () => {
    const isImageFileMock = vi.mocked(isImageFile);
    const loadImageAsBase64Mock = vi.mocked(loadImageAsBase64);
    isImageFileMock.mockReturnValue(true);
    loadImageAsBase64Mock.mockResolvedValue({
      fileName: "image.png",
      mimeType: "image/png",
      base64: "image-data",
      sizeBytes: 1,
    });
    vi.spyOn(Date, "now").mockReturnValueOnce(3_000).mockReturnValueOnce(3_050);

    const harness = createHarness();
    try {
      const first = await harness.runPaste("/tmp/image.png");
      expect(first.image).not.toBeNull();

      const second = await harness.runPaste("second paste");
      expect(second).toEqual({ text: "second paste", image: null });
      expect(isImageFileMock).toHaveBeenCalledTimes(1);
      expect(loadImageAsBase64Mock).toHaveBeenCalledTimes(1);
    } finally {
      harness.unmount();
    }
  });
});
