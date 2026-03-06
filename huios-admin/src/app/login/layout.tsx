import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login - Huios Seminário Teológico",
    description: "Acesse o sistema de gestão acadêmica do Seminário Teológico Huios",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
