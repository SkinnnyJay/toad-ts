import { resolveUiSymbols } from "@/constants/ui-symbols";
import type { UiSymbols } from "@/constants/ui-symbols";
import { useMemo } from "react";

export const useUiSymbols = (): UiSymbols => {
  return useMemo(() => resolveUiSymbols(), []);
};
