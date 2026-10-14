"use client"

import { Plus, X } from "lucide-react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"

import { FormFieldError, FormFieldLabel } from "@/components/forms/FormFieldState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { ActivityFormValues } from "../../lib/activityFormValues"

/** Editable checklist for a todo activity. */
export function TodoFields({ form }: { form: UseFormReturn<ActivityFormValues> }) {
  const {
    control,
    register,
    formState: { errors },
  } = form
  const items = useFieldArray({ control, name: "todo_items" })

  return (
    <div className="flex flex-col gap-2">
      <FormFieldLabel id="activity-todo-label" required>
        Todo items
      </FormFieldLabel>
      <div
        className="space-y-2"
        role="group"
        aria-labelledby="activity-todo-label"
        aria-describedby={errors.todo_items ? "activity-todo-error" : undefined}
      >
        {items.fields.map((field, i) => (
          <div key={field.id} className="group/item flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-colors group-hover/item:bg-primary/50" />
            </div>
            <Input
              aria-label={`Todo item ${i + 1}`}
              placeholder={`Item ${i + 1}…`}
              className="h-8 flex-1 text-sm"
              {...register(`todo_items.${i}.text`)}
            />
            <Button
              type="button"
              onClick={() => items.remove(i)}
              aria-label="Remove item"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <FormFieldError id="activity-todo-error">{errors.todo_items?.message}</FormFieldError>
      <Button
        type="button"
        onClick={() => items.append({ id: crypto.randomUUID(), text: "", completed: false })}
        variant="ghost"
        size="sm"
        className="self-start text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  )
}
