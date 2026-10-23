"use client";

import DestinationWeather from "@/components/weather/destination-weather";
import Navbar from "@/components/layout/navbar";

import { useEffect, useState } from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";

import type { Booking } from "@/types/booking";
import type { Flight } from "@/types/flight";
import type { Seat } from "@/types/seat";
import type { BookingCard } from "@/types/ui";

export default function MyBookingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingCard[]>([]);
  const setCachedBookings = useUserStore((state) => state.setCachedBookings);

  function getStatusStyles(status: string) {
    switch (status) {
      case "confirmed":
        return `
        bg-green-100
        text-green-700
        dark:bg-green-900/30
        dark:text-green-300
      `;

      case "rescheduled":
        return `
        bg-yellow-100
        text-yellow-700
        dark:bg-yellow-900/30
        dark:text-yellow-300
      `;

      case "cancelled":
        return `
        bg-red-100
        text-red-700
        dark:bg-red-900/30
        dark:text-red-300
      `;

      default:
        return "";
    }
  }

  useEffect(() => {
    async function loadBookings() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);

          return;
        }

        // BOOKINGS (legacy system)
        const { data: bookingData, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("user_id", user.id)
          .order("booked_at", {
            ascending: false,
          });

        console.log(error);

        // DUFFEL BOOKINGS (new system)
        const { data: duffelData, error: duffelError } = await supabase
          .from("duffel_bookings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        console.log(duffelError);

        const legacyBookings: BookingCard[] = (bookingData ?? []).map(
          (booking) => ({
            ...booking,
            flight: undefined,
            seat: undefined,
          }),
        );

        const duffelBookings: BookingCard[] = (duffelData ?? []).map(
          (booking) => {
            const itinerary = booking.itinerary as
              | { slices: Array<{ origin?: string; destination?: string; segments: Array<{ airline?: string; flightNumber?: string; origin?: string; destination?: string; departingAt?: string; arrivingAt?: string }> }> }
              | undefined;
            const firstSlice = itinerary?.slices?.[0];
            const firstSegment = firstSlice?.segments?.[0];

            return {
              id: booking.id,
              user_id: booking.user_id,
              flight_id: "",
              seat_id: "",
              status: booking.status as Booking["status"],
              booked_at: booking.created_at,
              total_price: Number(booking.total_amount ?? 0),
              pnr_code: booking.booking_reference ?? "",
              flight: firstSegment
                ? {
                    id: "",
                    flight_no: firstSegment.flightNumber ?? "",
                    aircraft_type: "",
                    base_price: 0,
                    status: "scheduled",
                    origin: firstSlice.origin ?? "",
                    destination: firstSlice.destination ?? "",
                    departs_at: firstSegment.departingAt ?? "",
                    arrives_at: firstSegment.arrivingAt ?? "",
                    created_at: "",
                  }
                : undefined,
              seat: undefined,
            };
          },
        );

        setBookings([...legacyBookings, ...duffelBookings]);
        setCachedBookings([...legacyBookings, ...duffelBookings]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  if (loading) {
    return (
      <div
        className="
        flex min-h-screen
        items-center
        justify-center
        text-2xl
      "
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <main
        className="
        min-h-screen
        bg-slate-50
        px-4 py-10
        dark:bg-slate-950
      "
      >
        <div
          className="
          mx-auto
          max-w-6xl
        "
        >
          <div
            className="
            mb-8 flex
            items-center
            justify-between
          "
          >
            <h1
              className="
              text-4xl
              font-bold
            "
            >
              My Bookings
            </h1>

            <span
              className="
              rounded-full
              bg-blue-100
              px-4 py-2
              text-sm
              font-medium
              text-blue-700
            "
            >
              {bookings.length} Booking(s)
            </span>
          </div>

          {bookings.length === 0 ? (
            <div
              className="
              rounded-[32px]
              bg-white
              p-12
              text-center
              shadow-lg
              dark:bg-slate-900
            "
            >
              <h2
                className="
                text-2xl
                font-bold
              "
              >
                No bookings yet
              </h2>

              <p
                className="
                mt-2
                text-slate-500
              "
              >
                Start booking your next flight.
              </p>

              <Link
                href="/"
                className="
                mt-6 inline-flex
                rounded-2xl
                bg-blue-600
                px-6 py-4
                font-semibold
                text-white
              "
              >
                Search Flights
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="
                    rounded-[32px]
                    bg-white
                    p-6
                    shadow-lg
                    dark:bg-slate-900
                  "
                >
                  <div
                    className="
                      flex flex-col
                      gap-6
                      lg:flex-row
                      lg:items-center
                      lg:justify-between
                    "
                  >
                    {/* LEFT */}
                    <div>
                      <div
                        className="
                          flex items-center
                          gap-3
                        "
                      >
                        <h2
                          className="
                            text-2xl
                            font-bold
                          "
                        >
                          {booking.flight?.flight_no}
                        </h2>

                        <span
                          className={`
                                      rounded-full
                                      px-3 py-1
                                      text-sm
                                      font-medium
                                      ${getStatusStyles(booking.status)}
                                    `}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <p
                        className="
                          mt-2
                          text-slate-500
                        "
                      >
                        {booking.flight?.origin}
                        {" → "}
                        {booking.flight?.destination}
                      </p>
                      {booking.flight?.destination && booking.flight?.departs_at && (
                        <DestinationWeather
                          airportCode={booking.flight.destination}
                          tripDate={booking.flight.departs_at.slice(0, 10)}
                          className="mt-3"
                        />
                      )}

                      <p className="mt-2">
                        PNR:{" "}
                        <span className="font-semibold">
                          {booking.pnr_code}
                        </span>
                      </p>

                      <p className="mt-1">
                        Seat: {booking.seat?.seat_number}
                        {" • "}
                        {booking.seat?.class}
                      </p>
                    </div>

                    {/* RIGHT */}
                    <div
                      className="
                        flex flex-col
                        gap-4
                        lg:items-end
                      "
                    >
                      <h3
                        className="
                          text-3xl
                          font-bold
                          text-blue-600
                        "
                      >
                        ₹{booking.total_price}
                      </h3>

                      <div
                        className="
                          flex flex-wrap
                          gap-3
                        "
                      >
                        <Link
                          href={`/my-bookings/${booking.id}`}
                          className="
                            rounded-2xl
                            bg-blue-600
                            px-5 py-3
                            text-white
                          "
                        >
                          View Ticket
                        </Link>

                        <Link
                          href={`/my-bookings/${booking.id}/reschedule`}
                          className="
                            rounded-2xl
                            border
                            px-5 py-3
                          "
                        >
                          Reschedule
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
