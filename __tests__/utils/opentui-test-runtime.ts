export interface KeyboardEvent {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

type KeyboardHandler = (event: KeyboardEvent) => void;

const keyboardHandlers = new Set<KeyboardHandler>();

const terminalState = {
  width: 80,
  height: 24,
};

export const keyboardRuntime = {
  subscribe(handler: KeyboardHandler): () => void {
    keyboardHandlers.add(handler);
    return () => {
      keyboardHandlers.delete(handler);
    };
  },
  emit(name: string, modifiers: Partial<KeyboardEvent> = {}): void {
    const event: KeyboardEvent = {
      name,
      ctrl: modifiers.ctrl,
      meta: modifiers.meta,
      shift: modifiers.shift,
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    };

    keyboardHandlers.forEach((handler) => handler(event));
  },
};

export const terminalRuntime = {
  get(): { width: number; height: number } {
    return { width: terminalState.width, height: terminalState.height };
  },
  set(width: number, height: number): void {
    terminalState.width = width;
    terminalState.height = height;
  },
};
