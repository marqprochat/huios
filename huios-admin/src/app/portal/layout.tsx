import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "../globals.css";
import PortalShell from "./components/PortalShell";
import { ToastProvider } from "../components/Toast/ToastContext";
import { ToastContainer } from "../components/Toast/ToastContainer";

const lexend = Lexend({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Huios - Portal do Aluno",
  description: "Portal do Aluno - Huios Seminário Teológico",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className={`${lexend.className} min-h-screen bg-[#f4f5f7]`}>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <PortalShell>
          {children}
        </PortalShell>
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}
