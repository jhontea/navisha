import { useEffect, useRef, useState } from "react"
import type { FieldValues, UseFormWatch } from "react-hook-form"
import { saveErrorMessage } from "@/lib/saveError"

/**
 * Inline save error for a form sheet: `guardSave` runs the
 * submit, keeps the sheet open on failure and stores the message for
 * FormActions. The message clears on the next submit or any field change.
 * Mutations behind it set `meta.handlesError`, so no global toast doubles it.
 */
export function useSaveError<T extends FieldValues>(watch: UseFormWatch<T>) {
  const [saveError, setSaveError] = useState<{ message: string; key: number } | null>(null)
  const attempts = useRef(0)

  useEffect(() => {
    const sub = watch(() => setSaveError(null))
    return () => sub.unsubscribe()
  }, [watch])

  const guardSave = async (save: () => Promise<unknown>) => {
    setSaveError(null)
    try {
      await save()
    } catch (err) {
      const message = saveErrorMessage(err)
      // A new key replays the shake even when the message is the same.
      if (message) setSaveError({ message, key: ++attempts.current })
    }
  }

  return { saveError, guardSave }
}
