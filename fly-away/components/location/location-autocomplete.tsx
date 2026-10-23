"use client";

import { useEffect, useId, useRef } from "react";

import { Loader2, MapPin, X } from "lucide-react";

import { useLocationSearch } from "@/hooks/useLocationSearch";
import { cn } from "@/lib/utils";
import type {
  LocationAutocompleteProps,
  LocationResult,
} from "@/types/location-autocomplete";

/**
 * Accessible location autocomplete backed by the Photon geocoding API.
 *
 * Implements the WAI-ARIA combobox pattern:
 * - the input owns `role="combobox"` with `aria-expanded` / `aria-controls`
 * - the active option is referenced through `aria-activedescendant`
 * - screen readers announce result counts and errors through live regions
 */
export default function LocationAutocomplete({
  value = null,
  onChange,
  label = "Location",
  placeholder = "Search for a city or place",
  disabled = false,
  debounceMs = 300,
  limit = 5,
  required = false,
  className,
}: LocationAutocompleteProps) {
  const {
    inputValue,
    isOpen,
    isLoading,
    error,
    results,
    highlightedIndex,
    handleInputChange,
    handleSelect,
    handleClear,
    closeDropdown,
    handleKeyDown,
    setSelectedLocation,
  } = useLocationSearch({ debounceMs, limit });

  const listboxId = useId();
  const inputId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Keep the input in sync with a controlled value ──
  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Close the dropdown when clicking outside ──
  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [closeDropdown]);

  function commit(result: LocationResult) {
    handleSelect(result);
    onChange?.(result);
  }

  function clearSelection() {
    handleClear();
    onChange?.(null);
  }

  const showDropdown = isOpen && !disabled;
  const activeOptionId =
    highlightedIndex >= 0 && results[highlightedIndex]
      ? optionId(highlightedIndex)
      : undefined;

  const statusMessage = error
    ? error
    : isLoading
      ? "Searching for locations"
      : showDropdown && results.length === 0
        ? "No locations found"
        : "";

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
    >
      <label
        htmlFor={inputId}
        className="
          mb-3 block
          text-lg font-semibold
        "
      >
        {label}
      </label>

      <div
        className="
          flex items-center
          gap-3 rounded-[24px]
          border border-slate-300
          px-5 py-5
          focus-within:border-blue-500
          focus-within:ring-2 focus-within:ring-blue-500/20
          dark:border-slate-700
        "
      >
        <MapPin className="shrink-0 text-slate-500" />

        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-required={required}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="
            w-full bg-transparent
            outline-none
            placeholder:text-slate-400
            disabled:cursor-not-allowed
          "
        />

        {isLoading && (
          <Loader2
            aria-hidden="true"
            className="shrink-0 animate-spin text-slate-400"
          />
        )}

        {!isLoading && inputValue && (
          <button
            type="button"
            aria-label="Clear location"
            onClick={clearSelection}
            className="
              shrink-0 rounded-full p-1
              text-slate-400 transition-colors
              hover:bg-slate-100 hover:text-slate-600
              dark:hover:bg-slate-800 dark:hover:text-slate-200
            "
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="
            absolute left-0 right-0 top-full z-50 mt-2
            max-h-72 overflow-y-auto
            rounded-[24px] border border-slate-200
            bg-white p-2 shadow-lg
            dark:border-slate-700 dark:bg-slate-900
          "
        >
          {results.length === 0 ? (
            <li
              className="
                px-4 py-3 text-sm
                text-slate-500
              "
            >
              {isLoading ? "Searching…" : "No locations found."}
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(event) => {
                  // Keep focus on the input so the click lands
                  event.preventDefault();
                }}
                onClick={() => commit(result)}
                className={cn(
                  "cursor-pointer rounded-[18px] px-4 py-3",
                  "text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                <span className="block font-medium">{result.name}</span>

                <span
                  className="
                    block text-xs
                    text-slate-500 dark:text-slate-400
                  "
                >
                  {[
                    result.city && result.city !== result.name
                      ? result.city
                      : undefined,
                    result.state,
                    result.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

