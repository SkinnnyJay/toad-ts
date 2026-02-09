import type { SubmitEvent } from "@opentui/core";
import type { ReactNode } from "react";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  focused?: boolean;
}

export function Input({
  value,
  onChange,
  onSubmit,
  placeholder,
  focused = true,
}: InputProps): ReactNode {
  const handleSubmit = (value: string | SubmitEvent): void => {
    if (typeof value !== "string") return;
    onSubmit(value);
  };

  return (
    <input
      value={value}
      placeholder={placeholder}
      focused={focused}
      onInput={onChange}
      onChange={onChange}
      onSubmit={handleSubmit}
    />
  );
}
