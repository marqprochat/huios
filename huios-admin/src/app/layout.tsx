export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/AppShell";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "Huios - Gestão Acadêmica",
  description: "Dashboard de Gerenciamento do Seminário Teológico Huios",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
