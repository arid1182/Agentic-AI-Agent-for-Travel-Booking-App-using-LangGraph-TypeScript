/**
 * Types for the Location Autocomplete component.
 * Decouples the UI from the geocoding API response format.
 */

export type LocationResult = {
  /** Unique key for the result (osm_id or generated) */
  id: string;
  /** Display name of the place */
  name: string;
  /** City (if available) */
  city?: string;
  /** State/region (if available) */
  state?: string;
  /** Country name */
  country: string;
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Full display label for the input field */
  label: string;
};

/**
 * Props for the LocationAutocomplete component.
 */
export type LocationAutocompleteProps = {
  /** Currently selected location (null if none) */
  value?: LocationResult | null;
  /** Callback when a location is selected from the dropdown */
  onChange?: (location: LocationResult | null) => void;
  /** Accessible label for the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Maximum number of results to show (default: 5) */
  limit?: number;
  /** Whether the input is required */
  required?: boolean;
  /** Additional CSS class name */
  className?: string;
};

/**
 * Internal state for the autocomplete component.
 */
export type LocationAutocompleteState = {
  /** Raw input text from the user */
  inputValue: string;
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Index of the currently highlighted result */
  highlightedIndex: number;
  /** Whether a search is in flight */
  isLoading: boolean;
  /** Error message if the search failed */
  error: string | null;
  /** Search results from the API */
  results: LocationResult[];
  /** Whether the user has explicitly selected a result */
  hasExplicitSelection: boolean;
};
