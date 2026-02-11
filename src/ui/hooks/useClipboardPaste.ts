import { isImageFile, loadImageAsBase64 } from "@/core/image-support";
import type { ImageAttachment } from "@/core/image-support";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { useCallback, useRef } from "react";

const logger = createClassLogger("ClipboardPaste");

export interface ClipboardPasteResult {
  text: string | null;
  image: ImageAttachment | null;
}

/**
 * Hook for handling Ctrl+V clipboard paste, including image support.
 * When an image path is pasted, it's converted to a base64 attachment for vision models.
 */
export const useClipboardPaste = () => {
  const lastPasteTime = useRef(0);

  const handlePaste = useCallback(async (pastedText: string): Promise<ClipboardPasteResult> => {
    const now = Date.now();
    // Debounce rapid paste events
    if (now - lastPasteTime.current < 100) {
      return { text: pastedText, image: null };
    }
    lastPasteTime.current = now;

    // Check if pasted text looks like an image file path
    const trimmed = pastedText.trim();
    if (isImageFile(trimmed)) {
      try {
        const image = await loadImageAsBase64(trimmed);
        if (image) {
          logger.info("Image pasted from clipboard", {
            file: image.fileName,
            size: image.sizeBytes,
          });
          return { text: `[Image: ${image.fileName}]`, image };
        }
      } catch {
        // Fall through to text paste
      }
    }

    return { text: pastedText, image: null };
  }, []);

  return { handlePaste };
};
