
import DuffelResults from "@/components/flight/duffel-results";
import Navbar from "@/components/layout/navbar";
import FlightSearch from "@/components/flight/flight-search";
import FlightCard from "@/components/flight/flight-card";

import { createClient } from "@/lib/supabase/server";

function getMinDepartureTime() {
  const thirtyMinutesFromNow = Date.now() + 30 * 60 * 1000;
  return new Date(thirtyMinutesFromNow).toISOString();
}

type FlightsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    date?: string;
    passengers?: string;
    adults?: string;
    childrenAges?: string;
    infantAges?: string;
    class?: string;
    source?: string;
  }>;
};

const allowedCabinClasses = [
  "economy",
  "premium_economy",
  "business",
  "first",
] as const;

export default async function FlightsPage({
  searchParams,
}: FlightsPageProps) {
  const params = await searchParams;

  // DUFFEL SEARCH: Do not query Supabase for external offers.
  if (params.source === "duffel") {
    const adults = Number(params.adults ?? params.passengers ?? "1");
    const childrenAges = params.childrenAges
      ? params.childrenAges.split(",").map(Number)
      : [];
    const infantAges = params.infantAges
      ? params.infantAges.split(",").map(Number)
      : [];
    const parsedPassengers =
      adults + childrenAges.length + infantAges.length;

    const validPassengers =
      Number.isInteger(adults) &&
      adults >= 1 &&
      parsedPassengers <= 9 &&
      childrenAges.every(
        (age) => Number.isInteger(age) && age >= 2 && age <= 17,
      ) &&
      infantAges.every(
        (age) => Number.isInteger(age) && age >= 0 && age < 2,
      ) &&
      infantAges.length <= adults;

    const requestedClass = params.class ?? "economy";

    const cabinClass = allowedCabinClasses.includes(
      requestedClass as (typeof allowedCabinClasses)[number],
    )
      ? requestedClass
      : "economy";

    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl">
            <FlightSearch />

            <div className="mt-10">
              <h1 className="mb-2 text-2xl font-bold dark:text-white">
                Duffel Test Flight Offers
              </h1>

              <p className="mb-6 text-sm text-slate-500">
                External test-mode offers are displayed separately from your
                local demo flights and bookings.
              </p>

              {validPassengers ? (
                <DuffelResults
                  origin={params.from ?? ""}
                  destination={params.to ?? ""}
                  departureDate={params.date ?? ""}
                  passengers={parsedPassengers}
                  adults={adults}
                  childrenAges={childrenAges}
                  infantAges={infantAges}
                  cabinClass={cabinClass}
                />
              ) : (
                <p role="alert" className="text-red-600">
                  Invalid passenger count. Please select between 1 and 9
                  passengers.
                </p>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  // EXISTING DEMO SEARCH: Preserve the current Supabase booking flow.
  const supabase = await createClient();

  let query = supabase
    .from("flights")
    .select("*")
    .eq("status", "scheduled");

  if (params.from) {
    query = query.eq("origin", params.from);
  }

  if (params.to) {
    query = query.eq("destination", params.to);
  }

  const minDeparture = getMinDepartureTime();

  if (params.date) {
    const startOfDay = `${params.date}T00:00:00`;
    const endOfDay = `${params.date}T23:59:59`;

    query = query
      .gte("departs_at", startOfDay)
      .lte("departs_at", endOfDay)
      .gte("departs_at", minDeparture);
  } else {
    query = query.gte("departs_at", minDeparture);
  }

  const { data: flights, error } = await query.order("departs_at", {
    ascending: true,
  });

  if (error) {
    console.error("Supabase flight search failed:", error.message);
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <FlightSearch />

          <div className="mt-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white">
                Available Flights
              </h2>

              <span className="text-slate-500">
                {flights?.length ?? 0} Flights
              </span>
            </div>

            {flights?.length === 0 && (
              <div className="rounded-[32px] bg-white p-10 text-center shadow-lg dark:bg-slate-900">
                <h3 className="text-2xl font-bold dark:text-white">
                  No flights found
                </h3>

                <p className="mt-2 text-slate-500">
                  Try changing destination or date.
                </p>
              </div>
            )}

            <div className="space-y-5">
              {flights?.map((flight) => (
                <FlightCard
                  key={flight.id}
                  id={flight.id}
                  airline={flight.flight_no}
                  stops="Non-stop"
                  departureDate={new Date(
                    flight.departs_at,
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  departureTime={new Date(
                    flight.departs_at,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  arrivalTime={new Date(
                    flight.arrives_at,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  origin={flight.origin}
                  destination={flight.destination}
                  duration={`${Math.floor(
                    (new Date(flight.arrives_at).getTime() -
                      new Date(flight.departs_at).getTime()) /
                      60000,
                  )} min`}
                  price={flight.base_price}
                  classOptions={[
                    {
                      type: "economy",
                      price: flight.base_price,
                    },
                    {
                      type: "business",
                      price: flight.base_price + 1500,
                    },
                    {
                      type: "first",
                      price: flight.base_price + 3000,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
