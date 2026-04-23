"use client";

import { useTheme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      <span className="material-symbols-outlined text-lg text-gray-500 dark:text-gray-400">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
