
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const AIRPORT_CODE = /^[A-Z]{3}$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

type DuffelPassengerInput = {
  type: "adult" | "child" | "infant_without_seat";
  age?: number;
};

export async function POST(request: NextRequest) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Duffel API token is not configured." },
      { status: 500 }
    );
  }

  let body: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    passengers?: number;
    adults?: number;
    childrenAges?: number[];
    infantAges?: number[];
    cabinClass?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const origin = body.origin?.trim().toUpperCase();
  const destination = body.destination?.trim().toUpperCase();
  const departureDate = body.departureDate;
  const adults = body.adults ?? body.passengers ?? 1;
  const childrenAges = body.childrenAges ?? [];
  const infantAges = body.infantAges ?? [];
  const cabinClass = body.cabinClass ?? "economy";

  if (
    !origin ||
    !destination ||
    !AIRPORT_CODE.test(origin) ||
    !AIRPORT_CODE.test(destination) ||
    origin === destination
  ) {
    return NextResponse.json(
      { error: "Provide different, valid three-letter airport codes." },
      { status: 400 }
    );
  }

  if (
    !departureDate ||
    !DATE_FORMAT.test(departureDate) ||
    Number.isNaN(Date.parse(`${departureDate}T00:00:00Z`)) ||
    new Date(`${departureDate}T00:00:00Z`)
      .toISOString()
      .slice(0, 10) !== departureDate
  ) {
    return NextResponse.json(
      { error: "Departure date must be a valid YYYY-MM-DD date." },
      { status: 400 }
    );
  }

  if (departureDate < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json(
      { error: "Departure date must not be in the past." },
      { status: 400 }
    );
  }

  if (!Array.isArray(childrenAges) || !Array.isArray(infantAges)) {
    return NextResponse.json(
      { error: "Invalid passenger counts or ages." },
      { status: 400 }
    );
  }

  const totalPassengers = adults + childrenAges.length + infantAges.length;

  if (
    !Number.isInteger(adults) ||
    adults < 1 ||
    totalPassengers > 9 ||
    childrenAges.some(
      (age) => !Number.isInteger(age) || age < 2 || age > 17,
    ) ||
    infantAges.some(
      (age) => !Number.isInteger(age) || age < 0 || age >= 2,
    ) ||
    infantAges.length > adults
  ) {
    return NextResponse.json(
      { error: "Invalid passenger counts or ages." },
      { status: 400 }
    );
  }

  const duffelPassengers: DuffelPassengerInput[] = [
    ...Array.from({ length: adults }, () => ({ type: "adult" as const })),
    ...childrenAges.map((age) => ({ type: "child" as const, age })),
    ...infantAges.map((age) => ({
      type: "infant_without_seat" as const,
      age,
    })),
  ];

  const allowedCabins = [
    "economy",
    "premium_economy",
    "business",
    "first",
  ];

  if (!allowedCabins.includes(cabinClass)) {
    return NextResponse.json(
      { error: "Unsupported cabin class." },
      { status: 400 }
    );
  }

  try {
    const duffelPassengers: DuffelPassengerInput[] = [
      ...Array.from({ length: adults }, () => ({
        type: "adult" as const,
      })),
      ...childrenAges.map((age) => ({
        type: "child" as const,
        age,
      })),
      ...infantAges.map((age) => ({
        type: "infant_without_seat" as const,
        age,
      })),
    ];

    const response = await fetch(
      "https://api.duffel.com/air/offer_requests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Duffel-Version": process.env.DUFFEL_VERSION ?? "v2",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            slices: [
              {
                origin,
                destination,
                departure_date: departureDate,
              },
            ],
            passengers: duffelPassengers,
            cabin_class: cabinClass,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(65000),
      }
    );

    const result = await response.json();

    const offers = result.data?.offers ?? [];

    return NextResponse.json({
      liveMode: result.data?.live_mode ?? false,
      offerRequestId: result.data?.id,
      offers: offers.map((offer: any) => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        currency: offer.total_currency,
        expiresAt: offer.expires_at,
        owner: offer.owner?.name,
        slices: (offer.slices ?? []).map((slice: any) => ({
          origin: slice.origin?.iata_code,
          destination: slice.destination?.iata_code,
          segments: (slice.segments ?? []).map((segment: any) => ({
            airline: segment.operating_carrier?.name,
            flightNumber: segment.marketing_carrier_flight_number,
            origin: segment.origin?.iata_code,
            destination: segment.destination?.iata_code,
            departingAt: segment.departing_at,
            arrivingAt: segment.arriving_at,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error("Duffel request failed:", error);

    return NextResponse.json(
      { error: "Unable to reach the flight search provider." },
      { status: 502 }
    );
  }
}
