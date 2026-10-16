"use client";

import { useRouter } from "next/navigation";

import { Calendar, MapPin, Search, Users } from "lucide-react";

import { airports } from "@/constants/airports";
import { useFlightStore } from "@/store/flight-store";

export default function FlightSearch() {
  const router = useRouter();

  const searchQuery = useFlightStore((state) => state.searchQuery);
  const setSearchQuery = useFlightStore((state) => state.setSearchQuery);
  const setBookingStep = useFlightStore((state) => state.setBookingStep);


  function handleSearch(source: "demo" | "duffel" = "demo") {
    if (!searchQuery.from || !searchQuery.to) return;

    if (source === "duffel") {
      if (!searchQuery.date || searchQuery.from === searchQuery.to) return;
    }

    setBookingStep("search");

    const params = new URLSearchParams();

    params.set("from", searchQuery.from);
    params.set("to", searchQuery.to);

    if (searchQuery.date) {
      params.set("date", searchQuery.date);
    }

    params.set("passengers", searchQuery.passengers.toString());
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
        <div>
          <label
            className="
            mb-3 block
            text-lg font-semibold
          "
          >
            Passengers
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
            <Users
              className="
              text-slate-500
            "
            />

            <select
              title="passenger"
              value={searchQuery.passengers}
              onChange={(e) =>
                setSearchQuery({ passengers: Number(e.target.value) })
              }
              className="
              w-full bg-transparent
              outline-none
            "
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <option className="dark:bg-slate-900" key={count} value={count}>
                  {count} Passenger
                  {count > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
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
          searchQuery.from === searchQuery.to
        }
        className="mt-3 w-full rounded-[28px] border border-blue-600 py-4 font-semibold text-blue-600 disabled:opacity-50"
      >
        Search Duffel Test Offers
      </button>


    </section>
  );
}
