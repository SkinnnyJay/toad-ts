declare module "tonl" {
  export function encodeSmart(value: unknown): string;
  export function encodeTONL(value: unknown): string;
  export function detectDelimiter(text: string): string;
}
