"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEffect, useId, useRef, useState } from "react"
import { Loader2, MapPin, X } from "lucide-react"
import { useLatestRef } from "@/lib/useLatestRef"
import { resolveMapsLink, searchLocationSuggestions } from "../api"
import type { LocationSearchKind, LocationSuggestion } from "../types"

// Detects a pasted Google Maps link (full or short). When it matches, the
// value is resolved via POST /locations/link instead of the suggestion flow.
const MAPS_LINK_RE =
  /^https?:\/\/(www\.)?(maps\.app\.goo\.gl|goo\.gl|google\.[a-z.]+|maps\.google\.[a-z.]+)\/(maps\/)?/i

function isMapsLink(text: string): boolean {
  const trimmed = text.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  return MAPS_LINK_RE.test(trimmed)
}

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
  searchContext?: string
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
  searchContext,
}: Props) {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedValueRef = useRef(value)
  // Stash latest callbacks in refs so the search effect doesn't need them as
  // dependencies (parents pass inline closures that change every render).
  const onChangeRef = useLatestRef(onChange)
  const onSelectRef = useLatestRef(onSelect)
  // When a suggestion is chosen, the parent often sets the value twice
  // (once to the full description via onChange, then again to the short name
  // via onSelect). This flag suppresses the search effect for exactly one
  // commit so the two value updates don't re-trigger a fetch and re-open the
  // suggestion list ("double appearance" bug).
  const suppressSearchRef = useRef(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState("")

  useEffect(() => {
    // A selection just committed — skip searching and re-sync the guard to the
    // value the parent actually kept (short name vs. full description).
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false
      selectedValueRef.current = value.trim()
      return
    }
    const query = value.trim()
    if (query === selectedValueRef.current) return
    // Too short to search; the input handler already cleared the list.
    if (query.length < 3) return

    // Pasted Google Maps link → resolve directly instead of suggesting.
    if (isMapsLink(query)) {
      const controller = new AbortController()
      ;(async () => {
        try {
          const { suggestion } = await resolveMapsLink(query, controller.signal)
          if (controller.signal.aborted) return
          selectedValueRef.current = suggestion.description
          suppressSearchRef.current = true
          onChangeRef.current(suggestion.description)
          onSelectRef.current(suggestion)
        } catch (requestError) {
          if (controller.signal.aborted) return
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not resolve this maps link",
          )
        } finally {
          if (!controller.signal.aborted) setIsLoading(false)
        }
      })()
      return () => controller.abort()
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setError("")
      try {
        const context = searchContext?.trim()
        const { suggestions } = await searchLocationSuggestions(
          query,
          kind,
          controller.signal,
          kind === "place" && context ? context : undefined,
        )
        setSuggestions(suggestions)
        setIsOpen(true)
        setActiveIndex(suggestions.length > 0 ? 0 : -1)
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
  }, [kind, searchContext, value, onChangeRef, onSelectRef])

  const choose = (suggestion: LocationSuggestion) => {
    selectedValueRef.current = suggestion.description
    suppressSearchRef.current = true
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
      <Input
        ref={inputRef}
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-required={ariaRequired}
        className={`h-auto w-full pr-10 ${className ?? ""}`}
        value={value}
        onChange={(event) => {
          selectedValueRef.current = ""
          setActiveIndex(-1)
          const query = event.target.value.trim()
          const mapsLink = isMapsLink(query)
          if (query.length < 3 || mapsLink) {
            setSuggestions([])
            setIsOpen(false)
            setError("")
          }
          if (mapsLink) setIsLoading(true)
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
          <Button
            type="button"
            onClick={clear}
            disabled={disabled}
            aria-label="Clear location"
variant="ghost" size="icon-xs" className="text-muted-foreground">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-100 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {error ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">{error}</p>
          ) : suggestions.length === 0 && !isLoading ? (
            <div role="status" className="px-3 py-2 text-sm">
              <p className="text-muted-foreground">No locations found</p>
              {kind === "place" && (
                <p className="mt-1 text-foreground">
                  Can&apos;t find it? In Google Maps, tap <span className="font-bold">Share</span>, copy the
                  link and paste it here.
                </p>
              )}
            </div>
          ) : (
            suggestions.map((suggestion, index) => {
              const primaryText = formatSuggestionTitle(suggestion, kind)
              const showDescription = primaryText !== suggestion.description

              return (
              // eslint-disable-next-line no-restricted-syntax -- listbox option (role=option) of the combobox
              <button
                key={`${suggestion.provider}:${suggestion.external_id}`}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left focus:outline-hidden ${
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
          <div className="flex items-center justify-between gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{kind === "place" && suggestions.length > 0 && !error ? "Tip: you can paste a Google Maps link" : ""}</span>
            <span className="shrink-0">Powered by Geoapify</span>
          </div>
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
