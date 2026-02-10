export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export const { OK, BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR } = HTTP_STATUS;
