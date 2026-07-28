"use client"

import { GoogleIcon } from "@/components/GoogleIcon"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

export function LoginButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = `${API_BASE}/auth/google`
      }}
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-chromatic-aurora px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <GoogleIcon className="h-5 w-5 shrink-0" />
      Continue with Google
    </button>
  )
}
