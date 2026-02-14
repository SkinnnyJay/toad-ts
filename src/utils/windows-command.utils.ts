const WINDOWS_COMMAND = {
  DOUBLE_QUOTE: '"',
  ESCAPED_DOUBLE_QUOTE: '""',
  EXEC_ARGS: ["/D", "/Q", "/S", "/C"],
} as const;

export const quoteWindowsCommandValue = (value: string): string => {
  const escaped = value.replaceAll(
    WINDOWS_COMMAND.DOUBLE_QUOTE,
    WINDOWS_COMMAND.ESCAPED_DOUBLE_QUOTE
  );
  return `${WINDOWS_COMMAND.DOUBLE_QUOTE}${escaped}${WINDOWS_COMMAND.DOUBLE_QUOTE}`;
};

export const buildWindowsCmdExecArgs = (command: string): string[] => {
  return [...WINDOWS_COMMAND.EXEC_ARGS, quoteWindowsCommandValue(command)];
};
