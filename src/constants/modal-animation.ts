export const MODAL_ANIMATION = {
  DURATION_MS: 150,
  FADE_STEPS: 8,
  BASE_SCALE: 0.95,
  SCALE_DELTA: 0.05,
} as const;

export type ModalAnimationConfig = typeof MODAL_ANIMATION;

export const { DURATION_MS, FADE_STEPS, BASE_SCALE, SCALE_DELTA } = MODAL_ANIMATION;
