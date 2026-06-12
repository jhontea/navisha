"use client"

import { Button } from "@/components/ui/button"
import { useLogout } from "../hooks"

export function LogoutButton() {
  const { mutate: logout, isPending } = useLogout()

  return (
    <Button variant="outline" size="sm" onClick={() => logout()} disabled={isPending}>
      {isPending ? "Logging out…" : "Log out"}
    </Button>
  )
}
