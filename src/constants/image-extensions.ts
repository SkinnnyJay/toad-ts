export const IMAGE_EXTENSION = {
  PNG: ".png",
  JPG: ".jpg",
  JPEG: ".jpeg",
  GIF: ".gif",
  WEBP: ".webp",
  BMP: ".bmp",
} as const;

export type ImageExtension = (typeof IMAGE_EXTENSION)[keyof typeof IMAGE_EXTENSION];

export const IMAGE_EXTENSIONS_SET = new Set<string>(Object.values(IMAGE_EXTENSION));

export const IMAGE_MIME_TYPE: Record<string, string> = {
  [IMAGE_EXTENSION.PNG]: "image/png",
  [IMAGE_EXTENSION.JPG]: "image/jpeg",
  [IMAGE_EXTENSION.JPEG]: "image/jpeg",
  [IMAGE_EXTENSION.GIF]: "image/gif",
  [IMAGE_EXTENSION.WEBP]: "image/webp",
  [IMAGE_EXTENSION.BMP]: "image/bmp",
} as const;
