"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

interface UserData {
    userId: string
    name: string
    email: string
    role: string
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)

    const isLoginPage = pathname === "/login"
    const isPortalRoute = pathname.startsWith("/portal")

    useEffect(() => {
        if (isLoginPage || isPortalRoute) {
            setLoading(false)
            return
        }

        async function fetchUser() {
            try {
                const res = await fetch("/api/auth/me")
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user)
                }
            } catch {
                // Silently fail - middleware handles redirect
            } finally {
                setLoading(false)
            }
        }

        fetchUser()
    }, [isLoginPage, isPortalRoute, pathname])

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" })
        setUser(null)
        router.push("/login")
        router.refresh()
    }

    // Login page - render without shell
    if (isLoginPage || isPortalRoute) {
        return <>{children}</>
    }

    // Loading
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-slate-500">Carregando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar user={user} onLogout={handleLogout} />
            <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-hidden">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-1 overflow-y-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
