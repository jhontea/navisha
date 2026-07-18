"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { searchLocationSuggestions } from "../api"
import type { LocationSearchKind, LocationSuggestion } from "../types"

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: LocationSuggestion) => void
  kind: LocationSearchKind
  placeholder?: string
  id?: string
  className?: string
}

export function GeoapifyAutocomplete({
  value,
  onChange,
  onSelect,
  kind,
  placeholder,
  id,
  className,
}: Props) {
  const listboxId = useId()
  const selectedValueRef = useRef("")
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const query = value.trim()
    if (query === selectedValueRef.current) return
    if (query.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      setError("")
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setError("")
      try {
        const response = await searchLocationSuggestions(
          query,
          kind,
          controller.signal,
        )
        setSuggestions(response.suggestions)
        setIsOpen(true)
      } catch (requestError) {
        if (controller.signal.aborted) return
        setSuggestions([])
        setIsOpen(true)
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Location search is unavailable",
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [kind, value])

  const choose = (suggestion: LocationSuggestion) => {
    selectedValueRef.current = suggestion.description
    setSuggestions([])
    setIsOpen(false)
    setError("")
    onChange(suggestion.description)
    onSelect(suggestion)
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        className={`w-full ${className ?? ""}`}
        value={value}
        onChange={(event) => {
          selectedValueRef.current = ""
          onChange(event.target.value)
        }}
        onFocus={() => {
          if (suggestions.length > 0 || error) setIsOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder ?? "Search location"}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      />
      {isLoading && (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-label="Searching locations"
        />
      )}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {error ? (
            <p className="px-3 py-2 text-sm text-destructive">{error}</p>
          ) : suggestions.length === 0 && !isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No locations found
            </p>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={`${suggestion.provider}:${suggestion.external_id}`}
                type="button"
                role="option"
                aria-selected="false"
                className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {suggestion.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.description}
                  </span>
                </span>
              </button>
            ))
          )}
          <p className="border-t px-3 py-1.5 text-right text-[10px] text-muted-foreground">
            Powered by Geoapify
          </p>
        </div>
      )}
    </div>
  )
}
