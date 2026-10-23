export type AirportCoordinates = {
  code: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

export const airportCoordinates: AirportCoordinates[] = [
  { code: "CCU", city: "Kolkata", country: "IN", lat: 22.6527, lon: 88.4456 },
  { code: "DEL", city: "Delhi", country: "IN", lat: 28.5562, lon: 77.1000 },
  { code: "BOM", city: "Mumbai", country: "IN", lat: 19.0896, lon: 72.8656 },
  { code: "BLR", city: "Bangalore", country: "IN", lat: 12.9500, lon: 77.6500 },
  { code: "MAA", city: "Chennai", country: "IN", lat: 12.9900, lon: 80.1700 },
  { code: "HYD", city: "Hyderabad", country: "IN", lat: 17.4500, lon: 78.4700 },
  { code: "PNQ", city: "Pune", country: "IN", lat: 18.5800, lon: 73.8500 },
  { code: "AMD", city: "Ahmedabad", country: "IN", lat: 23.0700, lon: 72.6300 },
  { code: "LHR", city: "London", country: "GB", lat: 51.4700, lon: -0.4543 },
  { code: "JFK", city: "New York", country: "US", lat: 40.6413, lon: -73.7781 },
];

export function getAirportCoordinates(code: string): AirportCoordinates | undefined {
  return airportCoordinates.find((a) => a.code === code.toUpperCase());
}
