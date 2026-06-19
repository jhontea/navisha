import Link from "next/link"
import { LoginButton } from "@/features/auth/components/LoginButton"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-surface-container-low">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4 relative z-10 min-h-screen">
        <div className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-soft p-8 md:p-10 transition-all duration-300 hover:shadow-xl mx-auto">
          {/* Brand Logo */}
          <div className="flex flex-col items-center mb-6">
            <Link href="/" className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
              <span className="material-symbols-outlined text-on-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                explore
              </span>
            </Link>
            <Link href="/" className="font-display text-headline-md text-primary tracking-tight hover:opacity-80 transition-opacity">
              Navisha
            </Link>
            <p className="font-geist text-headline-sm text-on-surface mt-2">Welcome back</p>
            <p className="font-body-sm text-on-surface-variant mt-1 text-center">
              Ready for your next adventure?
            </p>
          </div>

          {/* Social Login */}
          <LoginButton />
         
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline-variant/20 relative z-10 text-center">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-label-md text-primary">Navisha</span>
          <span className="font-body-sm text-outline">© 2024 Navisha Travel. All rights reserved.</span>
        </div>
        <div className="flex gap-6 flex-wrap justify-center">
          <a
            className="font-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="font-body-sm text-on-surface-variant hover:text-primary transition-colors"
            href="#"
          >
            Help Center
          </a>
        </div>
      </footer>
    </main>
  )
}
