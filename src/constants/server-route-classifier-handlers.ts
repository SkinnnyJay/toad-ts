export const SERVER_ROUTE_CLASSIFIER_HANDLER = {
  CORE_ROUTE_CLASSIFIER: "core_route_classifier",
  API_ROUTE_CLASSIFIER: "api_route_classifier",
} as const;

export type ServerRouteClassifierHandler =
  (typeof SERVER_ROUTE_CLASSIFIER_HANDLER)[keyof typeof SERVER_ROUTE_CLASSIFIER_HANDLER];
