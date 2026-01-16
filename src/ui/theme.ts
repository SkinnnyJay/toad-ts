import { MESSAGE_ROLE } from "@/constants/message-roles";

export const palette = {
  background: "#000000",
  text: "#FFFFFF",
  dim: "#808080",
  user: "#00BFFF",
  assistant: "#90EE90",
  system: "#FFD700",
  codeBg: "#2F4F4F",
  border: "#404040",
  error: "#FF6B6B",
  success: "#4CAF50",
  warning: "#FFA726",
};

export const roleColor = (role: string): string => {
  switch (role) {
    case MESSAGE_ROLE.USER:
      return palette.user;
    case MESSAGE_ROLE.ASSISTANT:
      return palette.assistant;
    case MESSAGE_ROLE.SYSTEM:
      return palette.system;
    default:
      return palette.text;
  }
};
