/**
 * TypeScript types for the Photon Geocoding API (komoot).
 *
 * Response format follows the GeocodeJson specification (GeoJSON FeatureCollection).
 * See: https://github.com/komoot/photon/blob/master/docs/api-v1.md
 */

export type PhotonGeometry = {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
};

export type PhotonExtra = Record<string, unknown>;

export type PhotonProperties = {
  osm_type: "N" | "W" | "R";
  osm_id: number;
  osm_key: string;
  osm_value: string;
  type?: string;
  name: string;
  city?: string;
  county?: string;
  state?: string;
  country: string;
  countrycode: string;
  postcode?: string;
  street?: string;
  housenumber?: string;
  extent?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  extra?: PhotonExtra;
};

export type PhotonFeature = {
  type: "Feature";
  properties: PhotonProperties;
  geometry: PhotonGeometry;
};

export type PhotonResponse = {
  type: "FeatureCollection";
  features: PhotonFeature[];
};

export type PhotonQueryParams = {
  /** Search term (mandatory unless filtering via include/exclude) */
  q?: string;
  /** Latitude for location bias */
  lat?: string;
  /** Longitude for location bias */
  lon?: string;
  /** Map zoom level for location bias radius (default: 12) */
  zoom?: string;
  /** Location bias scale (0.0 to 1.0) */
  location_bias_scale?: string;
  /** Maximum number of results (default: 5) */
  limit?: string;
  /** Preferred language (default: "en") */
  lang?: string;
  /** Include categories (OSM tags) */
  include?: string;
  /** Exclude categories (OSM tags) */
  exclude?: string;
  /** Filter by OSM tag key:value */
  osm_tag?: string;
  /** Filter by layer (house, street, locality, district, city, county, state, country, other) */
  layer?: string;
  /** Disable deduplication (0 to disable) */
  dedupe?: string;
};

/**
 * Normalized geocoding result consumed by the application.
 * Decouples the app from the Photon-specific response format.
 */
export type GeocodingResult = {
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
  /** OSM feature type (node, way, relation) */
  osmType: string;
  /** OSM feature ID */
  osmId: number;
  /** Postcode (if available) */
  postcode?: string;
  /** Street (if available) */
  street?: string;
  /** Layer category (city, locality, etc.) */
  layer?: string;
  /** Raw Photon feature for reference */
  raw: PhotonFeature;
};

/**
 * Normalizes a PhotonFeature into a GeocodingResult.
 */
export function normalizePhotonFeature(feature: PhotonFeature): GeocodingResult {
  const { properties, geometry } = feature;
  const [lon, lat] = geometry.coordinates;

  return {
    name: properties.name,
    city: properties.city,
    state: properties.state,
    country: properties.country,
    countryCode: properties.countrycode,
    lat,
    lon,
    osmType: properties.osm_type,
    osmId: properties.osm_id,
    postcode: properties.postcode,
    street: properties.street,
    layer: properties.type,
    raw: feature,
  };
}

/**
 * Normalizes a PhotonResponse into an array of GeocodingResult.
 */
export function normalizePhotonResponse(response: PhotonResponse): GeocodingResult[] {
  return response.features.map(normalizePhotonFeature);
}

