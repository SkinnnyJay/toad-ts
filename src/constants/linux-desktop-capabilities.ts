export const LINUX_DESKTOP_CAPABILITY = {
  NON_LINUX: "non_linux",
  HEADLESS: "headless",
  WAYLAND: "wayland",
  X11: "x11",
  MIXED: "mixed",
} as const;

export type LinuxDesktopCapability =
  (typeof LINUX_DESKTOP_CAPABILITY)[keyof typeof LINUX_DESKTOP_CAPABILITY];

export const { NON_LINUX, HEADLESS, WAYLAND, X11, MIXED } = LINUX_DESKTOP_CAPABILITY;
