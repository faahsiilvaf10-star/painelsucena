import React, { useState, useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render children to prevent blank screen if hydration/mounting is delayed
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
