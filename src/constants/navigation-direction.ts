/**
 * Direction for navigation (e.g. child session cycle).
 */
export const NAVIGATION_DIRECTION = {
  PREV: "prev",
  NEXT: "next",
} as const;

export type NavigationDirection = (typeof NAVIGATION_DIRECTION)[keyof typeof NAVIGATION_DIRECTION];

export const { PREV, NEXT } = NAVIGATION_DIRECTION;
