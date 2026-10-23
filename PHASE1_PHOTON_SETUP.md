# Photon Geocoding API — Phase 1: API Setup

## Status: ✅ Complete

---

## 1. Photon API Documentation Review ✅

**Source:** https://github.com/komoot/photon/blob/master/docs/api-v1.md

### Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api` | Forward geocoding (find place by name/address) |
| `/structured` | Find places by well-formatted address |
| `/reverse` | Reverse geocoding (find what's at a coordinate) |
| `/status` | Health check (optional) |
| `/metrics` | Prometheus metrics (optional) |

### Request Parameters (`/api`)
| Parameter | Description |
|-----------|-------------|
| `q` | Search term (mandatory unless using include/exclude filters) |
| `lat`, `lon` | Location bias center point |
| `zoom` | Map zoom level for bias radius (default: 12) |
| `location_bias_scale` | Bias influence (0.0–1.0) |
| `limit` | Max results |
| `lang` | Preferred language |
| `include`/`exclude` | Category filters (OSM tags) |
| `osm_tag` | Filter by OSM tag key:value |
| `layer` | Filter by layer (house, street, locality, city, country, etc.) |
| `dedupe` | Disable deduplication (0 to disable) |

### Response Format
GeoJSON `FeatureCollection` following the GeocodeJson spec. Each feature's `properties` contains:
- `name`, `city`, `county`, `state`, `country`, `countrycode`
- `postcode`, `street`, `housenumber`
- `osm_type` (N/W/R), `osm_id`, `osm_key`, `osm_value`
- `geometry.coordinates` = `[lon, lat]`

---

## 2. Public Endpoint Accessibility ✅

**Tested:** `curl https://photon.komoot.io/api/?q=Delhi&limit=3`

**Result:** HTTP 200, valid GeoJSON response with 3 Delhi matches (Delhi state, Delhi city, Delhi Iowa).

The public endpoint is fully accessible from the server.

---

## 3. Configuration Defined ✅

**File:** `fly-away/.env.local`

```env
# Photon Geocoding API (komoot) - server-side only, no API key required
# Public endpoint: https://photon.komoot.io/api/
# Reverse geocoding: https://photon.komoot.io/reverse
# Terms: Free for fair use; extensive usage may be throttled. No availability guarantee.
PHOTON_API_URL=https://photon.komoot.io/api/
PHOTON_API_REVERSE_URL=https://photon.komoot.io/reverse
```

**Config module:** `fly-away/lib/photon-config.ts`

Exports `PHOTON_CONFIG` with `baseUrl`, `reverseUrl`, `defaultLimit`, `defaultLang`, `requestTimeoutMs`, and `cacheTtlMs`. Includes `validatePhotonConfig()` for startup validation.

Defaults are provided so the app works even if env vars are unset.

---

## 4. Self-Hosted vs Public Service ✅

**Decision: Use the public service (`photon.komoot.io`)**

### Rationale
| Factor | Public Service | Self-Hosted |
|--------|---------------|-------------|
| Setup effort | None (just add env vars) | High (Docker, OSM data import, maintenance) |
| Cost | Free | Server costs + engineering time |
| API key | Not required | Not required |
| Rate limits | Throttled on extensive use | Self-controlled |
| Availability | "Not guaranteed" (per terms) | Self-controlled |
| Data freshness | Minutely OSM updates | Controlled by you |

For the FlyAway travel app's current scale (moderate geocoding lookups for destination weather), the public service is appropriate. Self-hosting can be reconsidered if rate limits or availability become issues.

---

## 5. Credential Security ✅

**No API key is required** by Photon's public service, so there are no credentials to expose.

### Security measures in place:
- `PHOTON_API_URL` and `PHOTON_API_REVERSE_URL` are in `.env.local` **without** `NEXT_PUBLIC_` prefix → server-side only, never bundled to client
- `.env.local` is listed in `.gitignore` → never committed to version control
- All Photon API calls will be made from server-side Next.js route handlers (same pattern as `/api/weather` and `/api/forecast`)
- No Photon-related constants or URLs are exported to client components

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `fly-away/.env.local` | Modified | Added `PHOTON_API_URL` and `PHOTON_API_REVERSE_URL` |
| `fly-away/lib/photon-config.ts` | Created | Configuration module with validation |
| `fly-away/types/photon.ts` | Created | TypeScript types + normalization helpers |

---

## Next Steps (Phase 2: API Route)

- Create `app/api/geocode/route.ts` — server-side forward geocoding endpoint
- Create `app/api/geocode/reverse/route.ts` — server-side reverse geocoding endpoint
- Integrate with weather cache (`lib/weather-cache.ts`) for TTL-based caching
- Add input validation and error handling following existing API route patterns
