/**
 * Photon Geocoding API configuration (komoot).
 *
 * Server-side only. No API key is required for the public endpoint.
 * The public service is free for fair use; extensive usage may be throttled.
 * See: https://photon.komoot.io/ and https://github.com/komoot/photon/blob/master/docs/api-v1.md
 *
 * Environment variables (set in .env.local, NOT committed to version control):
 *   PHOTON_API_URL      - Forward geocoding endpoint (default: https://photon.komoot.io/api/)
 *   PHOTON_API_REVERSE_URL - Reverse geocoding endpoint (default: https://photon.komoot.io/reverse)
 */

export const PHOTON_CONFIG = {
  baseUrl:
    process.env.PHOTON_API_URL ?? "https://photon.komoot.io/api/",
  reverseUrl:
    process.env.PHOTON_API_REVERSE_URL ?? "https://photon.komoot.io/reverse",

  // Default request parameters
  defaultLimit: 5,
  defaultLang: "en",

  // Request timeout in ms
  requestTimeoutMs: 10_000,

  // Cache TTL for geocoding results (1 hour - location data changes infrequently)
  cacheTtlMs: 60 * 60 * 1000,
} as const;

/**
 * Validates that Photon configuration is present.
 * Throws if required configuration is missing.
 */
export function validatePhotonConfig(): void {
  if (!PHOTON_CONFIG.baseUrl) {
    throw new Error(
      "PHOTON_API_URL is not configured. Set it in .env.local or environment.",
    );
  }
  if (!PHOTON_CONFIG.reverseUrl) {
    throw new Error(
      "PHOTON_API_REVERSE_URL is not configured. Set it in .env.local or environment.",
    );
  }
}
