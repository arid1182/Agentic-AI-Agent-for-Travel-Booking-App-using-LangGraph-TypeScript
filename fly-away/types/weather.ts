export type WeatherCoord = {
  lon: number;
  lat: number;
};

export type WeatherSys = {
  type: number;
  id: number;
  country: string;
  sunrise: number;
  sunset: number;
};

export type Weather = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

export type WeatherMain = {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  sea_level?: number;
  grnd_level?: number;
};

export type WeatherWind = {
  speed: number;
  deg: number;
  gust?: number;
};

export type WeatherClouds = {
  all: number;
};

export type WeatherRain = {
  "1h"?: number;
  "3h"?: number;
};

export type WeatherSnow = {
  "1h"?: number;
  "3h"?: number;
};

export type CurrentWeather = {
  coord: WeatherCoord;
  weather: Weather[];
  base: string;
  main: WeatherMain;
  visibility: number;
  wind: WeatherWind;
  clouds: WeatherClouds;
  rain?: WeatherRain;
  snow?: WeatherSnow;
  dt: number;
  sys: WeatherSys;
  timezone: number;
  id: number;
  name: string;
  cod: number;
};

export type ForecastListItem = {
  dt: number;
  main: WeatherMain;
  weather: Weather[];
  clouds: WeatherClouds;
  wind: WeatherWind;
  visibility: number;
  pop: number;
  rain?: WeatherRain;
  snow?: WeatherSnow;
  sys: { pod: string };
  dt_txt: string;
};

export type ForecastCity = {
  id: number;
  name: string;
  coord: WeatherCoord;
  country: string;
  population: number;
  timezone: number;
  sunrise: number;
  sunset: number;
};

export type ForecastResponse = {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastListItem[];
  city: ForecastCity;
};

export type WeatherResponse = {
  data: CurrentWeather;
};

export type ForecastApiResponse = {
  data: ForecastResponse;
};

export type WeatherError = {
  error: string;
  details?: unknown;
};

export type WeatherQueryParams = {
  lat?: string;
  lon?: string;
  city?: string;
  units?: "metric" | "imperial" | "standard";
  lang?: string;
};

export type ForecastDateInfo = {
  available: boolean;
  message?: string;
  closestForecast?: ForecastListItem;
};

export type DestinationWeather = {
  airportCode: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  tripDate: string;
  forecast: ForecastListItem | null;
  dateInfo: ForecastDateInfo;
  error?: string;
  loading: boolean;
};
