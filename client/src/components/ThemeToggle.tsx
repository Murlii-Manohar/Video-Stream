import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className="theme-switch">
      <input 
        type="checkbox" 
        checked={theme === "dark"}
        onChange={toggleTheme}
      />
      <span className="slider rounded-full">
        <SunIcon className="sun h-4 w-4" />
        <MoonIcon className="moon h-4 w-4" />
      </span>
    </label>
  );
}
