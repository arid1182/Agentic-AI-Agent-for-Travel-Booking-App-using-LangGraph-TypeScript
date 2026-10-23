"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LocationAutocompleteState, LocationResult } from "@/types/location-autocomplete";

function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  ms: number,
): { cancel: () => void; flush: () => void } & T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: never[] = [];

  const debounced = ((...args: never[]) => {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const callArgs = pendingArgs;
      pendingArgs = [];
      fn(...callArgs);
    }, ms);
  }) as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = [];
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      const callArgs = pendingArgs;
      pendingArgs = [];
      fn(...callArgs);
    }
  };

  return debounced;
}

function buildLabel(result: {
  name: string;
  city?: string;
  state?: string;
  country: string;
}): string {
  const parts = [
    result.name,
    result.city && result.city !== result.name ? result.city : undefined,
    result.state,
    result.country,
  ].filter(Boolean);

  return parts.join(", ");
}

function normalizeResult(
  raw: {
    name: string;
    city?: string;
    state?: string;
    country: string;
    countryCode: string;
    lat: number;
    lon: number;
  },
  index: number,
): LocationResult {
  return {
    id: `${raw.lat},${raw.lon},${index}`,
    name: raw.name,
    city: raw.city,
    state: raw.state,
    country: raw.country,
    countryCode: raw.countryCode,
    lat: raw.lat,
    lon: raw.lon,
    label: buildLabel({
      name: raw.name,
      city: raw.city,
      state: raw.state,
      country: raw.country,
    }),
  };
}
export function useLocationSearch({
  debounceMs = 300,
  limit = 5,
}: {
  debounceMs?: number;
  limit?: number;
} = {}) {
  const [state, setState] = useState<LocationAutocompleteState>({
    inputValue: "",
    isOpen: false,
    highlightedIndex: -1,
    isLoading: false,
    error: null,
    results: [],
    hasExplicitSelection: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const selectedLocationRef = useRef<LocationResult | null>(null);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      await performSearch(query);
    }, debounceMs),
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
      abortControllerRef.current?.abort();
    };
  }, [debouncedSearch]);
  async function performSearch(query: string): Promise<void> {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch(
        `/api/geocoding?q=${encodeURIComponent(query)}`,
        {
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        if (response.status === 400) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            results: [],
            error: null,
          }));
          return;
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.results)) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          results: [],
          error: "Received an invalid response from the geocoding service.",
        }));
        return;
      }

      const results = data.results
        .slice(0, limit)
        .map((raw: unknown, index: number) =>
          normalizeResult(
            raw as {
              name: string;
              city?: string;
              state?: string;
              country: string;
              countryCode: string;
              lat: number;
              lon: number;
            },
            index,
          ),
        );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        results,
        error: results.length === 0 ? null : prev.error,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
        results: [],
      }));
    }
  }
  const handleInputChange = useCallback(
    (nextValue: string) => {
      setState((prev) => ({
        ...prev,
        inputValue: nextValue,
        highlightedIndex: -1,
        hasExplicitSelection: false,
      }));
      selectedLocationRef.current = null;

      if (!nextValue || nextValue.trim().length < 2) {
        setState((prev) => ({
          ...prev,
          isOpen: false,
          results: [],
          error: null,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isOpen: true }));
      debouncedSearch(nextValue.trim());
    },
    [debouncedSearch],
  );

  const handleSelect = useCallback(
    (result: LocationResult) => {
      setState((prev) => ({
        ...prev,
        inputValue: result.label,
        isOpen: false,
        highlightedIndex: -1,
        error: null,
        hasExplicitSelection: true,
      }));
      selectedLocationRef.current = result;
    },
    [],
  );

  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      inputValue: "",
      isOpen: false,
      highlightedIndex: -1,
      results: [],
      error: null,
      hasExplicitSelection: false,
    }));
    selectedLocationRef.current = null;
  }, []);

  /**
   * Closes the dropdown without discarding the current input text or the
   * selected location. Used when the user clicks outside the component.
   */
  const closeDropdown = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      highlightedIndex: -1,
    }));
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const { results, isOpen, highlightedIndex } = state;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          if (!isOpen) {
            setState((prev) => ({ ...prev, isOpen: true }));
            break;
          }
          setState((prev) => ({
            ...prev,
            highlightedIndex:
              prev.highlightedIndex >= prev.results.length - 1
                ? 0
                : prev.highlightedIndex + 1,
          }));
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          if (!isOpen) {
            setState((prev) => ({ ...prev, isOpen: true }));
            break;
          }
          setState((prev) => ({
            ...prev,
            highlightedIndex:
              prev.highlightedIndex <= 0
                ? prev.results.length - 1
                : prev.highlightedIndex - 1,
          }));
          break;
        }

        case "Enter": {
          event.preventDefault();
          if (
            isOpen &&
            highlightedIndex >= 0 &&
            results[highlightedIndex]
          ) {
            handleSelect(results[highlightedIndex]);
          }
          break;
        }

        case "Escape": {
          setState((prev) => ({
            ...prev,
            isOpen: false,
            highlightedIndex: -1,
          }));
          break;
        }

        default:
          break;
      }
    },
    [state, handleSelect],
  );

  const selectedLocation = state.hasExplicitSelection
    ? selectedLocationRef.current
    : null;

  const setInputValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, inputValue: value }));
  }, []);

  const setSelectedLocation = useCallback((location: LocationResult | null) => {
    selectedLocationRef.current = location;
    setState((prev) => ({
      ...prev,
      inputValue: location?.label ?? "",
      hasExplicitSelection: location !== null,
      isOpen: false,
      highlightedIndex: -1,
    }));
  }, []);

  return {
    inputValue: state.inputValue,
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    error: state.error,
    results: state.results,
    highlightedIndex: state.highlightedIndex,
    selectedLocation,
    hasExplicitSelection: state.hasExplicitSelection,

    handleInputChange,
    handleSelect,
    handleClear,
    closeDropdown,
    handleKeyDown,
    setInputValue,
    setSelectedLocation,
  };
}

