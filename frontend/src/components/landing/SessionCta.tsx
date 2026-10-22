"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

import { GoogleIcon } from "@/components/GoogleIcon"
import { useLandingSignedIn } from "./session"

/**
 * Landing call to action: "Go to my trips" for a signed-in visitor, otherwise
 * the sign-in link. `google` shows the Google mark and "Continue with Google";
 * without it the label is "Sign in".
 */
export function SessionCta({
  google = false,
  onClick,
  ...props
}: { google?: boolean } & Omit<ComponentProps<typeof Link>, "href" | "prefetch" | "children">) {
  const signedIn = useLandingSignedIn()

  return (
    <Link href={signedIn ? "/trips" : "/login"} prefetch={false} onClick={onClick} {...props}>
      {signedIn ? (
        "Go to my trips"
      ) : google ? (
        <>
          <GoogleIcon className="h-5 w-5 shrink-0" />
          Continue with Google
        </>
      ) : (
        "Sign in"
      )}
    </Link>
  )
}
