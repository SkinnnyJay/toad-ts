/**
 * HTTP method names. Use instead of raw strings in server and API route handlers.
 */
export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export type HttpMethod = (typeof HTTP_METHOD)[keyof typeof HTTP_METHOD];

export const { GET, POST, PUT, DELETE } = HTTP_METHOD;
