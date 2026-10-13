import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/money"

/**
 * An amount of money: symbol + grouped number with the currency's own
 * decimals (no cents for IDR/JPY/KRW/VND) and tabular digits so columns of
 * amounts line up.
 */
export function MoneyText({
  amount,
  currency,
  className,
}: {
  amount: number
  currency: string
  className?: string
}) {
  return <span className={cn("whitespace-nowrap tabular-nums", className)}>{formatMoney(amount, currency)}</span>
}
