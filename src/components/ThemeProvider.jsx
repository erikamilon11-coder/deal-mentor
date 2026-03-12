import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const updateTheme = (e) => {
      const newTheme = e.matches ? "dark" : "light";
      setTheme(newTheme);
      document.documentElement.classList.toggle("dark", e.matches);
    };

    updateTheme(mediaQuery);
    mediaQuery.addEventListener("change", updateTheme);
    
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);