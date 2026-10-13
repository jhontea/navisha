import type { Metadata } from "next"

import { BudgetScreen } from "@/features/expense/screens/BudgetScreen"

export const metadata: Metadata = { title: "Budget" }

export default function Page() {
  return <BudgetScreen />
}
