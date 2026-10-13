import { notFound } from "next/navigation"

import { UiCatalog } from "./UiCatalog"

export const metadata = { title: "UI catalog · Navisha (dev)" }

/**
 * Component and token catalog for checking design consistency without
 * opening every page (docs/DESIGN_SYSTEM.md). Development only.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <UiCatalog />
}
