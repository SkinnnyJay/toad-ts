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
}: InputProps): JSX.Element {
  return (
    <input
      value={value}
      placeholder={placeholder}
      focused={focused}
      onInput={onChange}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  );
}
