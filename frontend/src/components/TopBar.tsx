import { Search } from "lucide-react"

export function TopBar() {
  return (
    <div className="sticky top-0 z-40 hidden items-center justify-between border-b bg-background/80 px-10 py-4 backdrop-blur-md md:flex">
      <div className="flex w-96 max-w-full items-center rounded-full border bg-muted/40 px-4 py-2">
        <Search className="mr-2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search trips, places, or contacts…"
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          disabled
        />
      </div>
      <button
        type="button"
        className="rounded-lg bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        Help Center
      </button>
    </div>
  )
}
