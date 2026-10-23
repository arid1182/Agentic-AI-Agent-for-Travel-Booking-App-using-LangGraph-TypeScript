"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Calendar, MapPin, Search } from "lucide-react";

import LocationWeather from "@/components/weather/location-weather";
import { airports } from "@/constants/airports";
import { matchAirport } from "@/lib/airport-matcher";
import { useFlightStore } from "@/store/flight-store";
import type { LocationResult } from "@/types/location-autocomplete";

export default function FlightSearch() {
  const router = useRouter();

  const searchQuery = useFlightStore((state) => state.searchQuery);
  const setSearchQuery = useFlightStore((state) => state.setSearchQuery);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);

  // Arbitrary destination picked via the Photon autocomplete. This never
  // touches the Duffel search params on its own — it only ever *suggests* an
  // airport code the user can opt into.
  const [destination, setDestination] = useState<LocationResult | null>(null);

  const destinationAirport = destination ? matchAirport(destination) : null;

  function handleSearch(source: "demo" | "duffel" = "demo") {
    const adults = searchQuery.adults ?? searchQuery.passengers ?? 1;
    const childrenAges = searchQuery.childrenAges ?? [];
    const infantAges = searchQuery.infantAges ?? [];
    const totalPassengers =
      adults + childrenAges.length + infantAges.length;

    if (!searchQuery.from || !searchQuery.to) return;

    if (source === "duffel") {
      if (
        !searchQuery.date ||
        searchQuery.from === searchQuery.to ||
        adults < 1 ||
        totalPassengers > 9 ||
        infantAges.length > adults
      ) {
        return;
      }
    }

    setBookingStep("search");

    const params = new URLSearchParams();

    params.set("from", searchQuery.from);
    params.set("to", searchQuery.to);

    if (searchQuery.date) {
      params.set("date", searchQuery.date);
    }

    params.set("passengers", totalPassengers.toString());
    params.set("adults", adults.toString());
    params.set("childrenAges", childrenAges.join(","));
    params.set("infantAges", infantAges.join(","));
    params.set("class", searchQuery.flightClass);
    params.set("source", source);

    router.push(`/flights?${params.toString()}`);
  }


  return (
    <section
      className="
      rounded-[36px]
      bg-white p-6
      shadow-lg
      dark:bg-slate-900
      dark:text-white
    "
    >
      <div
        className="
        grid gap-6
        md:grid-cols-2
        xl:grid-cols-3
      "
      >
        {/* FROM */}
        <div>
          <label
            className="
            mb-3 block
            text-lg font-semibold
          "
          >
            From
          </label>

          <div
            className="
            flex items-center
            gap-3 rounded-[24px]
            border border-slate-300
            px-5 py-5
            dark:border-slate-700
          "
          >
            <MapPin
              className="
              text-slate-500
            "
            />

            <select
              title="city"
              value={searchQuery.from}
              onChange={(e) => setSearchQuery({ from: e.target.value })}
              className="
              w-full bg-transparent
              outline-none
            "
            >
              <option value="">Select City</option>

              {airports.map((airport) => (
                <option
                  className="dark:bg-slate-900"
                  key={airport.code}
                  value={airport.code}
                >
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TO */}
        <div>
          <label
            className="
            mb-3 block
            text-lg font-semibold
          "
          >
            To
          </label>

          <div
            className="
            flex items-center
            gap-3 rounded-[24px]
            border border-slate-300
            px-5 py-5
            dark:border-slate-700
          "
          >
            <MapPin
              className="
              text-slate-500
            "
            />

            <select
              title="city"
              value={searchQuery.to}
              onChange={(e) => setSearchQuery({ to: e.target.value })}
              className="
              w-full bg-transparent
              outline-none
            "
            >
              <option value="">Select City</option>

              {airports.map((airport) => (
                <option
                  className="dark:bg-slate-900"
                  key={airport.code}
                  value={airport.code}
                >
                  {airport.city} ({airport.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DATE */}
        <div>
          <label
            className="
            mb-3 block
            text-lg font-semibold
          "
          >
            Departure
          </label>

          <div
            className="
            flex items-center
            gap-3 rounded-[24px]
            border border-slate-300
            px-5 py-5
            dark:border-slate-700
          "
          >
            <Calendar
              className="
              text-slate-500
            "
            />

            <input
              title="date"
              type="date"
              value={searchQuery.date}
              onChange={(e) => setSearchQuery({ date: e.target.value })}
              className="
              w-full bg-transparent
              outline-none
            "
            />
          </div>
        </div>

        {/* PASSENGERS */}
        <div className="md:col-span-2 xl:col-span-3">
          <label className="mb-3 block text-lg font-semibold">
            Passengers
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Adults (18+)
              </label>
              <select
                title="Adults"
                value={searchQuery.adults ?? searchQuery.passengers ?? 1}
                onChange={(e) => {
                  const adults = Number(e.target.value);
                  const childrenAges = searchQuery.childrenAges ?? [];
                  const infantAges = searchQuery.infantAges ?? [];
                  setSearchQuery({
                    adults,
                    passengers:
                      adults + childrenAges.length + infantAges.length,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n} className="dark:bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Children (2–17)
              </label>
              <select
                title="Children"
                value={(searchQuery.childrenAges ?? []).length}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  const currentAges = searchQuery.childrenAges ?? [];
                  const childrenAges = Array.from(
                    { length: count },
                    (_, i) => currentAges[i] ?? 8,
                  );
                  const adults = searchQuery.adults ?? searchQuery.passengers ?? 1;
                  const infantAges = searchQuery.infantAges ?? [];
                  setSearchQuery({
                    childrenAges,
                    passengers:
                      adults + childrenAges.length + infantAges.length,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n} className="dark:bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Infants (under 2)
              </label>
              <select
                title="Infants"
                value={(searchQuery.infantAges ?? []).length}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  const currentAges = searchQuery.infantAges ?? [];
                  const infantAges = Array.from(
                    { length: count },
                    (_, i) => currentAges[i] ?? 1,
                  );
                  const adults = searchQuery.adults ?? searchQuery.passengers ?? 1;
                  const childrenAges = searchQuery.childrenAges ?? [];
                  setSearchQuery({
                    infantAges,
                    passengers:
                      adults + childrenAges.length + infantAges.length,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n} className="dark:bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {((searchQuery.childrenAges ?? []).length > 0 ||
            (searchQuery.infantAges ?? []).length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(searchQuery.childrenAges ?? []).map((age, index) => (
                <div key={`child-${index}`}>
                  <label className="mb-2 block text-sm font-medium">
                    Child {index + 1} age
                  </label>
                  <select
                    value={age}
                    onChange={(e) => {
                      const childrenAges = [
                        ...(searchQuery.childrenAges ?? []),
                      ];
                      childrenAges[index] = Number(e.target.value);
                      setSearchQuery({ childrenAges });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n} className="dark:bg-slate-900">
                        {n} years
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {(searchQuery.infantAges ?? []).map((age, index) => (
                <div key={`infant-${index}`}>
                  <label className="mb-2 block text-sm font-medium">
                    Infant {index + 1} age
                  </label>
                  <select
                    value={age}
                    onChange={(e) => {
                      const infantAges = [...(searchQuery.infantAges ?? [])];
                      infantAges[index] = Number(e.target.value);
                      setSearchQuery({ infantAges });
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
                  >
                    {[0, 1].map((n) => (
                      <option key={n} value={n} className="dark:bg-slate-900">
                        {n === 0 ? "Under 1 year" : "1 year"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-sm text-slate-500">
            Total passengers: {(searchQuery.adults ?? searchQuery.passengers ?? 1) +
              (searchQuery.childrenAges ?? []).length +
              (searchQuery.infantAges ?? []).length}
          </p>
        </div>

        {/* CLASS */}
        <div>
          <label
            className="
            mb-3 block
            text-lg font-semibold
          "
          >
            Class
          </label>

          <div
            className="
            rounded-[24px]
            border border-slate-300
            px-5 py-5
            dark:border-slate-700
          "
          >
            <select
              title="flight-type"
              value={searchQuery.flightClass}
              onChange={(e) =>
                setSearchQuery({
                  flightClass: e.target.value as
                    | "economy"
                    | "business"
                    | "first",
                })
              }
              className="
              w-full bg-transparent
              outline-none
              dark:bg-slate-900
            "
            >
              <option value="economy">Economy</option>

              <option value="business">Business</option>

              <option value="first">First Class</option>
            </select>
          </div>
        </div>
      </div>

      {/* SEARCH BUTTON */}
      <button
        onClick={() => handleSearch("demo")}
        disabled={!searchQuery.from || !searchQuery.to}
        className="
        mt-8 flex w-full
        items-center
        justify-center gap-3
        rounded-[28px]
        bg-blue-600 py-6
        text-xl font-semibold
        text-white transition
        hover:bg-blue-700
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
      >
        <Search size={24} />
        Search Flights
      </button>

      <button
        type="button"
        onClick={() => handleSearch("duffel")}
        disabled={
          !searchQuery.from ||
          !searchQuery.to ||
          !searchQuery.date ||
          searchQuery.from === searchQuery.to ||
          (searchQuery.adults ?? searchQuery.passengers ?? 1) +
            (searchQuery.childrenAges ?? []).length +
            (searchQuery.infantAges ?? []).length >
            9 ||
          (searchQuery.infantAges ?? []).length >
            (searchQuery.adults ?? searchQuery.passengers ?? 1)
        }
        className="mt-3 w-full rounded-[28px] border border-blue-600 py-4 font-semibold text-blue-600 disabled:opacity-50"
      >
        Search Duffel Test Offers
        </button>

      {/* DESTINATION WEATHER */}
      <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-800">
        <h2 className="mb-1 text-lg font-semibold">Destination weather</h2>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Search any city worldwide to check the forecast for your trip. This
          is independent of the airport codes used for the flight search.
        </p>

        <LocationWeather
          tripDate={searchQuery.date || undefined}
          onLocationChange={setDestination}
          showAirportMatch
        />

        {destinationAirport && (
          <button
            type="button"
            onClick={() => setSearchQuery({ to: destinationAirport.code })}
            className="mt-4 w-full rounded-[24px] border border-blue-600 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            Use {destinationAirport.city} ({destinationAirport.code}) as
            destination
          </button>
        )}
      </div>
    </section>
  );
}
