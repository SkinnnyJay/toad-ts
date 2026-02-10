import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { LIMIT } from "@/config/limits";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("ImageSupport");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);

export interface ImageAttachment {
  fileName: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

/**
 * Check if a file path refers to an image file.
 */
export const isImageFile = (filePath: string): boolean => {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
};

/**
 * Get MIME type for an image extension.
 */
export const getImageMimeType = (filePath: string): string => {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
};

/**
 * Load an image file and encode it as base64 for sending to vision models.
 * Used when the user mentions @image.png in their prompt.
 */
export const loadImageAsBase64 = async (filePath: string): Promise<ImageAttachment | null> => {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.size > LIMIT.MAX_IMAGE_SIZE_BYTES) {
      logger.warn("Image too large", { file: filePath, size: fileStat.size });
      return null;
    }

    const buffer = await readFile(filePath);
    const base64 = buffer.toString("base64");
    const fileName = filePath.split("/").pop() ?? filePath;

    return {
      fileName,
      mimeType: getImageMimeType(filePath),
      base64,
      sizeBytes: fileStat.size,
    };
  } catch (error) {
    logger.warn("Failed to load image", {
      file: filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Extract @image mentions from input text and resolve them to image attachments.
 */
export const extractImageMentions = async (
  input: string,
  cwd: string
): Promise<{ cleanInput: string; images: ImageAttachment[] }> => {
  const mentionRegex = /@([\w./-]+\.(?:png|jpg|jpeg|gif|webp|bmp))/gi;
  const matches = Array.from(input.matchAll(mentionRegex));

  if (matches.length === 0) {
    return { cleanInput: input, images: [] };
  }

  const images: ImageAttachment[] = [];
  let cleanInput = input;

  for (const match of matches) {
    const mention = match[0];
    const fileName = match[1];
    if (!mention || !fileName) continue;

    const { resolve } = await import("node:path");
    const filePath = resolve(cwd, fileName);
    const image = await loadImageAsBase64(filePath);
    if (image) {
      images.push(image);
    }
    cleanInput = cleanInput.replace(mention, `[Image: ${fileName}]`);
  }

  return { cleanInput, images };
};
