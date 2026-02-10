export const PERFORMANCE_MARK = {
  STARTUP_START: "startup_start",
  STARTUP_READY: "startup_ready",
  SESSION_LOAD_START: "session_load_start",
  SESSION_LOAD_END: "session_load_end",
  STREAM_RENDER_START: "stream_render_start",
  STREAM_RENDER_END: "stream_render_end",
} as const;

export type PerformanceMark = (typeof PERFORMANCE_MARK)[keyof typeof PERFORMANCE_MARK];

export const PERFORMANCE_MEASURE = {
  STARTUP: "startup",
  SESSION_LOAD: "session_load",
  STREAM_RENDER: "stream_render",
} as const;

export type PerformanceMeasure = (typeof PERFORMANCE_MEASURE)[keyof typeof PERFORMANCE_MEASURE];

export const {
  STARTUP_START,
  STARTUP_READY,
  SESSION_LOAD_START,
  SESSION_LOAD_END,
  STREAM_RENDER_START,
  STREAM_RENDER_END,
} = PERFORMANCE_MARK;

export const { STARTUP, SESSION_LOAD, STREAM_RENDER } = PERFORMANCE_MEASURE;
