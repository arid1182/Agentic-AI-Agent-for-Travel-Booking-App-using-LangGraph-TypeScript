export interface Airport {
  city: string;
  code: string;
  lat: number;
  lon: number;
}

export const airports: Airport[] = [
  {
    city: "Kolkata",
    code: "CCU",
    lat: 22.5673,
    lon: 88.3712,
  },
  {
    city: "Delhi",
    code: "DEL",
    lat: 28.5562,
    lon: 77.1042,
  },
  {
    city: "Mumbai",
    code: "BOM",
    lat: 19.0896,
    lon: 72.8656,
  },
  {
    city: "Bangalore",
    code: "BLR",
    lat: 12.9716,
    lon: 77.5946,
  },
  {
    city: "Chennai",
    code: "MAA",
    lat: 13.0827,
    lon: 80.2708,
  },
  {
    city: "Hyderabad",
    code: "HYD",
    lat: 17.3850,
    lon: 78.4569,
  },
  {
    city: "Pune",
    code: "PNQ",
    lat: 18.5796,
    lon: 73.8446,
  },
  {
    city: "Ahmedabad",
    code: "AMD",
    lat: 23.0309,
    lon: 72.5600,
  },

  {
    city: "London",
    code: "LHR",
    lat: 51.4700,
    lon: -0.4543,
  },

  {
    city: "New York",
    code: "JFK",
    lat: 40.6413,
    lon: -73.7781,
  },
];
