import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function Input({ value, onChange, onSubmit }: InputProps): JSX.Element {
  const [buffer, setBuffer] = useState(value);

  useEffect(() => {
    setBuffer(value);
  }, [value]);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(buffer);
      setBuffer("");
      onChange("");
      return;
    }
    if (key.backspace || key.delete) {
      const next = buffer.slice(0, -1);
      setBuffer(next);
      onChange(next);
      return;
    }
    if (input) {
      const next = buffer + input;
      setBuffer(next);
      onChange(next);
    }
  });

  return (
    <Box flexDirection="row" gap={1}>
      <Text>›</Text>
      <Text>{buffer || ""}</Text>
    </Box>
  );
}
