export const REWIND_MODAL_OPTION_KIND = {
  SELECTION: "selection",
  REWIND: "rewind",
} as const;

export type RewindModalOptionKind =
  (typeof REWIND_MODAL_OPTION_KIND)[keyof typeof REWIND_MODAL_OPTION_KIND];

export const { SELECTION, REWIND } = REWIND_MODAL_OPTION_KIND;
