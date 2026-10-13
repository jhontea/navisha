import { GoogleIcon } from "@/components/GoogleIcon"
import { buttonVariants } from "@/components/ui/button"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

export function LoginButton() {
  return (
    <a href={`${API_BASE}/auth/google`} className={buttonVariants({ size: "lg", className: "w-full" })}>
      <GoogleIcon className="h-5 w-5 shrink-0" />
      Continue with Google
    </a>
  )
}
