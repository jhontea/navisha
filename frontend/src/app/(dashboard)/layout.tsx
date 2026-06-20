import { MobileNav } from "@/components/MobileNav"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <TopBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  )
}
