export const CLOUD_SUBCOMMAND = {
  LIST: "list",
  STATUS: "status",
  STOP: "stop",
  FOLLOWUP: "followup",
} as const;

export type CloudSubcommand = (typeof CLOUD_SUBCOMMAND)[keyof typeof CLOUD_SUBCOMMAND];

export const { LIST, STATUS, STOP, FOLLOWUP } = CLOUD_SUBCOMMAND;
