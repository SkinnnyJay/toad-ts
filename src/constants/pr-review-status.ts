export const PR_REVIEW_STATUS = {
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
  REVIEW_REQUIRED: "review_required",
  UNKNOWN: "unknown",
} as const;

export type PrReviewStatus = (typeof PR_REVIEW_STATUS)[keyof typeof PR_REVIEW_STATUS];

export const PR_REVIEW_COLOR = {
  [PR_REVIEW_STATUS.APPROVED]: "#00FF00",
  [PR_REVIEW_STATUS.CHANGES_REQUESTED]: "#FF4444",
  [PR_REVIEW_STATUS.REVIEW_REQUIRED]: "#FFAA00",
  [PR_REVIEW_STATUS.UNKNOWN]: "#888888",
} as const;
