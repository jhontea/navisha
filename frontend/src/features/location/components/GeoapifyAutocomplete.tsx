"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2, MapPin, X } from "lucide-react"
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
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  ariaLabel?: string
  ariaRequired?: boolean
}

export function GeoapifyAutocomplete({
  value,
  onChange,
  onSelect,
  kind,
  placeholder,
  id,
  className,
  disabled,
  ariaInvalid,
  ariaDescribedBy,
  ariaLabel,
  ariaRequired,
}: Props) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedValueRef = useRef(value)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState("")

  useEffect(() => {
    const query = value.trim()
    if (query === selectedValueRef.current) return
    if (query.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      setActiveIndex(-1)
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
        setActiveIndex(response.suggestions.length > 0 ? 0 : -1)
      } catch (requestError) {
        if (controller.signal.aborted) return
        setSuggestions([])
        setIsOpen(true)
        setActiveIndex(-1)
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
    setActiveIndex(-1)
    setError("")
    onChange(suggestion.description)
    onSelect(suggestion)
  }

  const clear = () => {
    selectedValueRef.current = ""
    setSuggestions([])
    setIsOpen(false)
    setActiveIndex(-1)
    setError("")
    onChange("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (suggestions.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0,
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) =>
        current > 0 ? current - 1 : suggestions.length - 1,
      )
      return
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0) {
      event.preventDefault()
      choose(suggestions[activeIndex])
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-required={ariaRequired}
        className={`w-full pr-10 ${className ?? ""}`}
        value={value}
        onChange={(event) => {
          selectedValueRef.current = ""
          setActiveIndex(-1)
          onChange(event.target.value)
        }}
        onFocus={() => {
          if (suggestions.length > 0 || error) setIsOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder ?? "Search location"}
        autoComplete="off"
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-busy={isLoading}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
      />
      <span className="sr-only" role="status" aria-live="polite">
        {isLoading
          ? "Searching locations"
          : isOpen && !error
            ? `${suggestions.length} location suggestion${suggestions.length === 1 ? "" : "s"} available`
            : ""}
      </span>
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        {isLoading ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Searching locations"
          />
        ) : value ? (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {error ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">{error}</p>
          ) : suggestions.length === 0 && !isLoading ? (
            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
              No locations found
            </p>
          ) : (
            suggestions.map((suggestion, index) => {
              const primaryText = formatSuggestionTitle(suggestion, kind)
              const showDescription = primaryText !== suggestion.description

              return (
              <button
                key={`${suggestion.provider}:${suggestion.external_id}`}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left focus:outline-none ${
                  activeIndex === index ? "bg-accent" : "hover:bg-accent"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    <HighlightedText text={primaryText} query={value} />
                  </span>
                  {showDescription && (
                    <span className="block truncate text-xs text-muted-foreground">
                      <HighlightedText
                        text={suggestion.description}
                        query={value}
                      />
                    </span>
                  )}
                </span>
              </button>
              )
            })
          )}
          <p className="border-t px-3 py-1.5 text-right text-[10px] text-muted-foreground">
            Powered by Geoapify
          </p>
        </div>
      )}
    </div>
  )
}

function formatSuggestionTitle(
  suggestion: LocationSuggestion,
  kind: LocationSearchKind,
) {
  if (kind !== "region") return suggestion.name

  const country = suggestion.description
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1)

  if (!country || suggestion.name.toLowerCase().includes(country.toLowerCase())) {
    return suggestion.name
  }

  return `${suggestion.name}, ${country}`
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return text

  const index = text.toLocaleLowerCase().indexOf(normalizedQuery)
  if (index < 0) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(index, index + normalizedQuery.length)}
      </mark>
      {text.slice(index + normalizedQuery.length)}
    </>
  )
}
