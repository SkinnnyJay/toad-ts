import { extractImageMentions, getImageMimeType, isImageFile } from "@/core/image-support";
import { describe, expect, it } from "vitest";

describe("ImageSupport", () => {
  describe("isImageFile", () => {
    it("should detect image extensions", () => {
      expect(isImageFile("photo.png")).toBe(true);
      expect(isImageFile("photo.jpg")).toBe(true);
      expect(isImageFile("photo.jpeg")).toBe(true);
      expect(isImageFile("photo.gif")).toBe(true);
      expect(isImageFile("photo.webp")).toBe(true);
    });

    it("should reject non-image extensions", () => {
      expect(isImageFile("code.ts")).toBe(false);
      expect(isImageFile("readme.md")).toBe(false);
      expect(isImageFile("data.json")).toBe(false);
    });
  });

  describe("getImageMimeType", () => {
    it("should return correct MIME types", () => {
      expect(getImageMimeType("test.png")).toBe("image/png");
      expect(getImageMimeType("test.jpg")).toBe("image/jpeg");
      expect(getImageMimeType("test.gif")).toBe("image/gif");
      expect(getImageMimeType("test.webp")).toBe("image/webp");
    });
  });

  describe("extractImageMentions", () => {
    it("should extract @image mentions from text", async () => {
      const result = await extractImageMentions("Look at @screenshot.png please", "/tmp");
      expect(result.cleanInput).toContain("[Image: screenshot.png]");
    });

    it("should return clean input with no mentions", async () => {
      const result = await extractImageMentions("no images here", "/tmp");
      expect(result.cleanInput).toBe("no images here");
      expect(result.images).toHaveLength(0);
    });
  });
});
