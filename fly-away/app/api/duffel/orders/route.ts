import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PassengerInput = {
  givenName?: string;
  familyName?: string;
  dob?: string;
  gender?: "m" | "f";
  title?: "mr" | "mrs" | "ms" | "miss";
  email?: string;
  phoneNumber?: string;
  passportNo?: string;
  nationality?: string;
};

type DuffelOfferPassenger = {
  id?: string;
  age?: number;
  type?: string;
};

type DuffelOffer = {
  id: string;
  expires_at?: string | null;
  total_amount?: string | null;
  total_currency?: string | null;
  passengers?: DuffelOfferPassenger[];
  payment_requirements?: {
    requires_instant_payment?: boolean;
  };
  slices?: any[];
};

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhoneNumber(value: string): boolean {
  // International format, e.g. +923001234567.
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function isValidPassenger(
  passenger: PassengerInput | null | undefined
): passenger is PassengerInput & {
  givenName: string;
  familyName: string;
  dob: string;
  gender: "m" | "f";
  title: "mr" | "mrs" | "ms" | "miss";
  email: string;
  phoneNumber: string;
} {
  if (!passenger) return false;

  const titles = ["mr", "mrs", "ms", "miss"];
  const genders = ["m", "f"];

  return (
    typeof passenger.givenName === "string" &&
    passenger.givenName.trim().length > 0 &&
    typeof passenger.familyName === "string" &&
    passenger.familyName.trim().length > 0 &&
    isValidDate(passenger.dob) &&
    genders.includes(passenger.gender ?? "") &&
    titles.includes(passenger.title ?? "") &&
    typeof passenger.email === "string" &&
    isValidEmail(passenger.email.trim()) &&
    typeof passenger.phoneNumber === "string" &&
    isValidPhoneNumber(passenger.phoneNumber.trim())
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in before creating a Duffel order." },
      { status: 401 }
    );
  }

  const token = process.env.DUFFEL_ACCESS_TOKEN;
  const version = process.env.DUFFEL_VERSION ?? "v2";

  if (!token) {
    return NextResponse.json(
      { error: "Duffel is not configured on the server." },
      { status: 500 }
    );
  }

  // Prevent accidental live order creation during this milestone.
  if (!token.startsWith("duffel_test_")) {
    return NextResponse.json(
      {
        error:
          "Order creation is restricted to a Duffel test token for this milestone.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    const offerId =
      typeof body.offerId === "string" ? body.offerId.trim() : "";

    const passengerData: unknown = body.passengers;

    if (!/^off_[A-Za-z0-9]+$/.test(offerId)) {
      return NextResponse.json(
        { error: "A valid Duffel offer ID is required." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(passengerData) ||
      passengerData.length < 1 ||
      passengerData.length > 9
    ) {
      return NextResponse.json(
        { error: "Provide between 1 and 9 passengers." },
        { status: 400 }
      );
    }

    for (let i = 0; i < passengerData.length; i++) {
      if (!isValidPassenger(passengerData[i] as PassengerInput)) {
        return NextResponse.json(
          {
            error:
              `Passenger ${i + 1}: provide given name, family name, ` +
              "valid date of birth, gender, title, valid email, and " +
              "an international-format phone number.",
          },
          { status: 400 }
        );
      }
    }

    // From this point, every passenger has passed validation.
    const validatedPassengers = passengerData as Array<
      PassengerInput & {
        givenName: string;
        familyName: string;
        dob: string;
        gender: "m" | "f";
        title: "mr" | "mrs" | "ms" | "miss";
        email: string;
        phoneNumber: string;
      }
    >;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": version,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Always refresh the offer server-side. Do not trust the browser's price.
    const offerResponse = await fetch(
      `https://api.duffel.com/air/offers/${encodeURIComponent(offerId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }
    );

    const offerPayload = await offerResponse.json().catch(() => ({}));

    if (!offerResponse.ok || !offerPayload.data) {
      console.error("Duffel offer refresh failed", {
        status: offerResponse.status,
        errors: offerPayload.errors,
      });

      return NextResponse.json(
        {
          error:
            "Duffel could not refresh this offer. Search again and select a current offer.",
        },
        { status: 409 }
      );
    }

    const offer = offerPayload.data as DuffelOffer;

    if (offer.expires_at && Date.parse(offer.expires_at) <= Date.now()) {
      return NextResponse.json(
        { error: "This offer has expired. Please search again." },
        { status: 409 }
      );
    }

    const offerPassengers = offer.passengers ?? [];

    // Never invent IDs: use the IDs returned by Duffel for this offer.
    if (
      offerPassengers.length !== validatedPassengers.length ||
      offerPassengers.some(
        (passenger) =>
          typeof passenger.id !== "string" || !passenger.id.trim()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The refreshed offer's passenger list does not match your form. Search again and select a new offer.",
        },
        { status: 409 }
      );
    }

    // This milestone only creates eligible held orders; it does not take payment.
    if (offer.payment_requirements?.requires_instant_payment !== false) {
      return NextResponse.json(
        {
          error:
            "This offer requires instant payment, or Duffel did not confirm hold eligibility. No order was created. Payment integration is a later milestone.",
          currentOffer: {
            id: offer.id,
            totalAmount: offer.total_amount,
            currency: offer.total_currency,
          },
        },
        { status: 409 }
      );
    }

    const passengers = validatedPassengers.map((passenger, index) => ({
      id: offerPassengers[index].id!,
      given_name: passenger.givenName.trim(),
      family_name: passenger.familyName.trim(),
      born_on: passenger.dob,
      gender: passenger.gender,
      title: passenger.title,
      email: passenger.email.trim(),
      phone_number: passenger.phoneNumber.trim(),
    }));

    const orderResponse = await fetch(
      "https://api.duffel.com/air/orders",
      {
        method: "POST",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          data: {
            type: "hold",
            selected_offers: [offerId],
            passengers,
          },
        }),
      }
    );

    const orderPayload = await orderResponse.json().catch(() => ({}));

    if (!orderResponse.ok || !orderPayload.data) {
      // Keep the provider's structured validation errors in server logs.
      // Never log access tokens or passenger document details.
      console.log(
        "Duffel offer passenger ages",
        offer.passengers?.map((p: DuffelOfferPassenger) => ({
          id: p.id,
          age: p.age,
          type: p.type,
        }))
      );

      return NextResponse.json(
        {
          error:
            "Duffel could not create the order. Review the passenger details and try again.",
          details:
            process.env.NODE_ENV === "development"
              ? orderPayload.errors
              : undefined,
        },
        { status: 502 }
      );
    }

    const order = orderPayload.data;

    const itinerarySlices = order.slices ?? offer.slices ?? [];

    const itinerary = {
      slices: itinerarySlices.map((slice: any) => ({
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
    };

    // Save the provider's actual order identifiers and price.
    const { data: savedBooking, error: saveError } = await supabase
      .from("duffel_bookings")
      .insert({
        user_id: user.id,
        offer_id: offerId,
        order_id: order.id,
        booking_reference: order.booking_reference ?? null,
        status: "held",
        total_amount: order.total_amount ?? offer.total_amount ?? null,
        currency: order.total_currency ?? offer.total_currency ?? null,
        passenger_count: passengers.length,
        itinerary,
      })
      .select(
        "id, order_id, booking_reference, status, total_amount, currency, created_at"
      )
      .single();

    if (saveError || !savedBooking) {
      // The Duffel order already exists; reconcile it rather than retrying blindly.
      console.error(
        "Duffel order created but Supabase persistence failed",
        {
          orderId: order.id,
          error: saveError?.message,
        }
      );

      return NextResponse.json(
        {
          error:
            "Duffel created the order, but saving it to your account failed. Contact support with this provider order ID.",
          providerOrderId: order.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: savedBooking,
    });
  } catch (error) {
    console.error("Duffel order endpoint error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unexpected error while processing the Duffel order." },
      { status: 500 }
    );
  }
}
