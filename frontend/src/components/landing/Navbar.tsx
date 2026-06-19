import Link from "next/link"

export function Navbar() {
  return (
    <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-max-width mx-auto sticky top-0 z-50 bg-surface/80 backdrop-blur-md">
      <Link href="/" className="text-headline-md font-headline-md font-bold text-primary">
        Navisha
      </Link>
      <div>
        <Link href="/login">
          <button className="text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors px-4 py-2">
            Login
          </button>
        </Link>
      </div>
    </nav>
  )
}
