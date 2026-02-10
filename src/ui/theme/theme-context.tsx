import type { ThemeName } from "@/constants/themes";
import { DEFAULT } from "@/constants/themes";
import { getThemeDefinition } from "@/ui/theme/theme-definitions";
import type { ThemeDefinition } from "@/ui/theme/theme-definitions";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const ThemeContext = createContext<ThemeDefinition>(getThemeDefinition(DEFAULT));

export interface ThemeProviderProps {
  theme: ThemeName;
  children: ReactNode;
}

export const ThemeProvider = ({ theme, children }: ThemeProviderProps): ReactNode => {
  const value = useMemo(() => getThemeDefinition(theme), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeDefinition => useContext(ThemeContext);
