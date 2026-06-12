"use client"

import { useAuth } from "../hooks"

export function UserBadge() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="h-9 w-32 animate-pulse rounded bg-muted" />
  }
  if (!user) return null

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.name}
          className="h-6 w-6 rounded-full"
        />
      ) : (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium">{user.name}</span>
        <span className="text-[10px] text-muted-foreground">{user.email}</span>
      </div>
    </div>
  )
}
