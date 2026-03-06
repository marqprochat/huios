import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "./components/AppShell";
import { ThemeProvider } from "./components/ThemeProvider";

const publicSans = Public_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Huios - Gestão Acadêmica",
  description: "Dashboard de Gerenciamento do Seminário Teológico Huios",
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
      <body className={`${publicSans.className} bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
