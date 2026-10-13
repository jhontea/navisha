import { redirect } from "next/navigation"

// The dashboard was merged into the Trips home (D3). The middleware already
// redirects /dashboard; this keeps the route safe if the middleware changes.
export default function DashboardPage() {
  redirect("/trips")
}
