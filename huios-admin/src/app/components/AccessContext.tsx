'use client'

import { createContext, useContext } from 'react'

import type { PermissionKey } from '@/lib/permissions/catalog'

export interface AccessUser {
  userId: string
  name: string
  email: string
  role: { id: string; key: string; name: string } | null
  permissions: string[]
  isStudent: boolean
  isSuperAdmin: boolean
}

type AccessContextValue = {
  user: AccessUser | null
  can(permission: PermissionKey): boolean
}

const AccessContext = createContext<AccessContextValue | null>(null)

export function AccessProvider({
  user,
  children,
}: {
  user: AccessUser | null
  children: React.ReactNode
}) {
  const can = (permission: PermissionKey) => Boolean(
    user?.isSuperAdmin || user?.permissions.includes(permission),
  )

  return (
    <AccessContext.Provider value={{ user, can }}>
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess() {
  const context = useContext(AccessContext)
  if (!context) {
    throw new Error('useAccess must be used inside AccessProvider')
  }
  return context
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { can } = useAccess()
  return can(permission) ? <>{children}</> : <>{fallback}</>
}
