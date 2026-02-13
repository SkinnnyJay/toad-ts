import { CONNECTION_STATUS, type ConnectionStatus } from "@/constants/connection-status";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";

export const shouldPollCursorCloudAgentCount = (
  harnessId: string | undefined,
  connectionStatus: ConnectionStatus | undefined
): boolean => {
  if (harnessId !== HARNESS_DEFAULT.CURSOR_CLI_ID) {
    return false;
  }
  return connectionStatus === CONNECTION_STATUS.CONNECTED;
};
