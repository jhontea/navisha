import type { Metadata } from "next"

import { ProfileScreen } from "@/features/auth/screens/ProfileScreen"

export const metadata: Metadata = { title: "Profile" }

export default function Page() {
  return <ProfileScreen />
}
