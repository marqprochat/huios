"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ToastProvider } from "./Toast/ToastContext";
import { ToastContainer } from "./Toast/ToastContainer";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <ToastProvider>
                {children}
                <ToastContainer />
            </ToastProvider>
        </NextThemesProvider>
    );
}
