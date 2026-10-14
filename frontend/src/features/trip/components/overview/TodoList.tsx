import Link from "next/link"
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react"

import type { OverviewTodo } from "@/features/trip/lib/overviewTodos"

/** What is still missing for the trip, each item linking to where it is fixed. */
export function TodoList({ todos }: { todos: OverviewTodo[] }) {
  return (
    <section aria-labelledby="overview-todo-heading">
      <h3 id="overview-todo-heading" className="mb-2 text-sm font-semibold text-foreground">
        To do
      </h3>
      {todos.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          Everything is in place.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {todos.map((todo) => (
            <li key={todo.label}>
              <Link
                href={todo.href}
                className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span className="flex-1">{todo.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
