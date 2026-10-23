"use client";

import DestinationWeather from "@/components/weather/destination-weather";
import Navbar from "@/components/layout/navbar";

import { useParams } from "next/navigation";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Booking } from "@/types/booking";
import { Flight } from "@/types/flight";
import { Seat } from "@/types/seat";
import { Passenger } from "@/types/passenger";
import { toast } from "sonner";
import router from "next/router";
import { useFlightStore } from "@/store/flight-store";

export default function BookingDetailsPage() {
  const supabase = createClient();

  const params = useParams();

  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);

  const [flight, setFlight] = useState<Flight | null>(null);

  const [seat, setSeat] = useState<Seat | null>(null);

  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [loading, setLoading] = useState(true);
  const [isDuffelBooking, setIsDuffelBooking] = useState(false);
  const resetBooking = useFlightStore((state) => state.resetBooking);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?",
    );

    if (!confirmed) return;

    const res = await fetch("/api/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking?.id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Cancellation failed");

      return;
    }

    resetBooking();
    toast.success("Booking cancelled");

    router.push("/my-bookings");
  }

  async function handleConfirmPayment() {
    const confirmed = window.confirm(
      "Are you sure you want to confirm payment and issue tickets for this booking?",
    );

    if (!confirmed) return;

    const res = await fetch("/api/duffel/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: booking?.id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.needsRebook) {
        toast.error(err.error);
        router.push("/flights");
        return;
      }
      toast.error(err.error || "Confirm payment failed");

      return;
    }

    toast.success("Booking confirmed");
    router.push("/my-bookings");
  }

  useEffect(() => {
    async function loadTicket() {
      // Try the legacy bookings table first.
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (bookingData) {
        setBooking(bookingData);
        setIsDuffelBooking(false);

        const { data: flightData } = await supabase
          .from("flights")
          .select("*")
          .eq("id", bookingData.flight_id)
          .single();

        setFlight(flightData);

        const { data: seatData } = await supabase
          .from("seats")
          .select("*")
          .eq("id", bookingData.seat_id)
          .single();

        setSeat(seatData);

        const { data: passengerData } = await supabase
          .from("passengers")
          .select("*")
          .eq("booking_id", bookingData.id);

        setPassengers(passengerData ?? []);

        setLoading(false);

        return;
      }

      // Fall back to Duffel bookings.
      const { data: duffelData } = await supabase
        .from("duffel_bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (!duffelData) {
        setLoading(false);

        return;
      }

      const itinerary = duffelData.itinerary as
        | {
            slices: Array<{
              origin?: string;
              destination?: string;
              segments: Array<{
                airline?: string;
                flightNumber?: string;
                origin?: string;
                destination?: string;
                departingAt?: string;
                arrivingAt?: string;
              }>;
            }>;
          }
        | undefined;
      const firstSlice = itinerary?.slices?.[0];
      const firstSegment = firstSlice?.segments?.[0];

      setBooking({
        id: duffelData.id,
        user_id: duffelData.user_id,
        flight_id: "",
        seat_id: "",
        status: duffelData.status as Booking["status"],
        booked_at: duffelData.created_at,
        total_price: Number(duffelData.total_amount ?? 0),
        pnr_code: duffelData.booking_reference ?? "",
      });

      setIsDuffelBooking(true);

      setFlight(
        firstSegment
          ? {
              id: "",
              flight_no: firstSegment.flightNumber ?? "",
              aircraft_type: "",
              base_price: 0,
              status: "scheduled",
              origin: firstSlice?.origin ?? "",
              destination: firstSlice?.destination ?? "",
              departs_at: firstSegment.departingAt ?? "",
              arrives_at: firstSegment.arrivingAt ?? "",
              created_at: "",
            }
          : null,
      );

      setSeat(null);
      setPassengers([]);

      setLoading(false);
    }

    loadTicket();
  }, [id]);

  if (loading) {
    return (
      <div
        className="
        flex min-h-screen
        items-center
        justify-center
      "
      >
        Loading...
      </div>
    );
  }

  if (!booking) {
    return (
      <div
        className="
        flex min-h-screen
        items-center
        justify-center
      "
      >
        Booking not found
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
          max-w-5xl
        "
        >
          <div
            className="
            rounded-[32px]
            bg-white
            p-8
            shadow-lg
            dark:bg-slate-900
          "
          >
            <div className="text-center">
              <div
                className="
                text-5xl
              "
              >
                ✈️
              </div>

              <h1
                className="
                mt-4
                text-4xl
                font-bold
              "
              >
                Flight Ticket
              </h1>

              <p
                className="
                mt-2
                text-slate-500
              "
              >
                PNR: {booking.pnr_code}
              </p>
            </div>

            <div
              className="
              mt-10 grid
              gap-6
              md:grid-cols-2
            "
            >
              <div>
                <h2
                  className="
                  text-xl
                  font-bold
                "
                >
                  Flight Details
                </h2>

                <div className="mt-4 space-y-3">
                  <p>Flight: {flight?.flight_no}</p>

                  <p>
                    Route: {flight?.origin}→{flight?.destination}
                  </p>
                  {flight?.destination && flight?.departs_at && (
                    <DestinationWeather
                      airportCode={flight.destination}
                      tripDate={flight.departs_at.slice(0, 10)}
                      className="mt-3"
                    />
                  )}

                  <p>
                    Departure Date:
                    <p className="font-bold">
                      {new Date(flight?.departs_at ?? "").toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        },
                      )}
                    </p>
                  </p>

                  <p>Seat: {seat?.seat_number}</p>

                  <p>Class: {seat?.class.toUpperCase()}</p>
                </div>
              </div>

              <div>
                <h2
                  className="
                  text-xl
                  font-bold
                "
                >
                  Passengers
                </h2>

                <div className="mt-4 space-y-4">
                  {passengers.map((p, index) => (
                    <div
                      key={p.id}
                      className="
                        rounded-2xl
                        border
                        p-4
                      "
                    >
                      <p>Passenger {index + 1}</p>

                      <p>{p.full_name}</p>

                      <p>{p.passport_no}</p>

                      <p>{p.nationality}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="
              mt-8
              flex justify-between
              border-t
              pt-6
              text-2xl
              font-bold
            "
            >
              <span>Total Paid</span>

              <span>₹{booking.total_price}</span>
            </div>
            {isDuffelBooking && booking?.status === "held" ? (
              <button
                onClick={handleConfirmPayment}
                className="
                        rounded-2xl
                        bg-blue-600
                        px-5 py-3
                        w-full
                        my-5
                        text-white
                      "
              >
                Confirm Booking
              </button>
            ) : null}
            <button
              onClick={handleCancel}
              className="
                        rounded-2xl
                        bg-red-600
                        px-5 py-3
                        w-full
                        my-5
                        text-white
                      "
            >
              Cancel Booking
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
