"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors w-10 h-10 flex items-center justify-center">
                <span className="material-symbols-outlined max-w-full">dark_mode</span>
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
            title="Alternar tema"
        >
            {theme === "dark" ? (
                <span className="material-symbols-outlined">light_mode</span>
            ) : (
                <span className="material-symbols-outlined">dark_mode</span>
            )}
        </button>
    );
}
