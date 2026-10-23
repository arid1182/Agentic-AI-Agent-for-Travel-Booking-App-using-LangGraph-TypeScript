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
  age?: number | null;
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

type DuffelOrder = {
  id: string;
  type?: string;
  booking_reference?: string | null;
  booking_references?: { booking_reference: string }[];
  total_amount?: string | null;
  total_currency?: string | null;
  payment_status?: {
    paid_at?: string | null;
    awaiting_payment?: boolean;
  };
  passengers?: any[];
  slices?: any[];
};

type DuffelPassengerPayload = {
  id: string;
  given_name: string;
  family_name: string;
  born_on: string;
  gender: string;
  title: string;
  email: string;
  phone_number: string;
  infant_passenger_id?: string;
};

/** Duffel passenger types, ordered as the API expects them. */
const PASSENGER_TYPE_ORDER: Record<string, number> = {
  adult: 0,
  child: 1,
  infant_without_seat: 2,
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

/**
 * Subtracts whole years from an ISO timestamp, keeping the result in UTC so
 * the day never shifts because of a timezone offset.
 */
function subtractYears(date: string, years: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);

  parsed.setUTCFullYear(parsed.getUTCFullYear() - years);

  return parsed.toISOString().slice(0, 10);
}

/**
 * Duffel exposes the travel date on the first segment, not on the slice.
 * `departure_date` is not part of the offer slice payload.
 */
function getTravelDate(offer: DuffelOffer): string | null {
  const segment = offer.slices?.[0]?.segments?.[0];
  const departingAt = segment?.departing_at;

  if (typeof departingAt === "string" && departingAt.length >= 10) {
    return departingAt.slice(0, 10);
  }

  const sliceDate = offer.slices?.[0]?.departure_date;

  if (typeof sliceDate === "string" && sliceDate.length >= 10) {
    return sliceDate.slice(0, 10);
  }

  return null;
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

/**
 * Maps the passenger form entries onto the passengers Duffel returned with
 * the offer.
 *
 * Duffel requires the passengers to be sent in the order adults, children,
 * then infants. Children and infants are always titled "miss". Infants have to
 * be associated with an adult through `infant_passenger_id`, and their
 * `born_on` has to match their age on the departure date.
 */
function buildOrderPassengers(
  offer: DuffelOffer,
  formPassengers: PassengerInput[],
  travelDate: string
): { passengers: DuffelPassengerPayload[]; error?: string } {
  const offerPassengers = offer.passengers ?? [];

  if (offerPassengers.length === 0) {
    return { passengers: [], error: "The offer has no passengers." };
  }

  if (formPassengers.length !== offerPassengers.length) {
    return {
      passengers: [],
      error:
        "The number of passenger details does not match the selected offer.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Pair each form entry with the offer passenger it belongs to before
  // re-ordering, so the details never move to a different traveller.
  const pairs = offerPassengers.map((offerPassenger, index) => ({
    offerPassenger,
    form: formPassengers[index],
  }));

  // Duffel expects adults first, then children, then infants.
  const ordered = pairs.sort(
    (a, b) =>
      (PASSENGER_TYPE_ORDER[a.offerPassenger.type ?? "adult"] ?? 0) -
      (PASSENGER_TYPE_ORDER[b.offerPassenger.type ?? "adult"] ?? 0)
  );

  const adults = ordered.filter(
    (pair) => pair.offerPassenger.type === "adult"
  );
  const infants = ordered.filter(
    (pair) => pair.offerPassenger.type === "infant_without_seat"
  );

  const passengers: DuffelPassengerPayload[] = [];

  ordered.forEach(({ offerPassenger, form }) => {
    if (!offerPassenger.id) {
      throw new Error("The offer contains a passenger without an id.");
    }

    const isInfant = offerPassenger.type === "infant_without_seat";
    const isChild = offerPassenger.type === "child";
    const age =
      typeof offerPassenger.age === "number" ? offerPassenger.age : null;

    let bornOn = form.dob as string;

    if (age !== null) {
      // The date of birth has to line up with the age on the travel date.
      bornOn = subtractYears(travelDate, age);

      // A newborn cannot have a date of birth in the future.
      if (bornOn > today) {
        bornOn = today;
      }
    }

    const payload: DuffelPassengerPayload = {
      id: offerPassenger.id,
      given_name: (form.givenName as string).trim(),
      family_name: (form.familyName as string).trim(),
      born_on: bornOn,
      gender: form.gender as string,
      title: isInfant || isChild ? "miss" : (form.title as string),
      email: (form.email as string).trim(),
      phone_number: (form.phoneNumber as string).trim(),
    };

    if (!isInfant) {
      // Every infant has to travel with an adult, so the first adults are
      // linked to the infants in order.
      const adultIndex = adults.findIndex(
        (pair) => pair.offerPassenger.id === offerPassenger.id
      );

      if (adultIndex !== -1 && adultIndex < infants.length) {
        payload.infant_passenger_id =
          infants[adultIndex].offerPassenger.id;
      }
    }

    passengers.push(payload);
  });

  return { passengers };
}

type DuffelApiResponse = {
  data?: DuffelOrder & { paid_at?: string | null };
  errors?: { code?: string; message?: string }[];
};

type DuffelRequestOptions = {
  token: string;
  version: string;
  offer: DuffelOffer;
  passengers: DuffelPassengerPayload[];
};

function duffelHeaders(token: string, version: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Duffel-Version": version,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * Creates a held order. The price is guaranteed for a short time and still
 * has to be paid through the payments endpoint.
 */
async function createHeldOrder({
  token,
  version,
  offer,
  passengers,
}: DuffelRequestOptions): Promise<DuffelApiResponse> {
  const response = await fetch("https://api.duffel.com/air/orders", {
    method: "POST",
    headers: duffelHeaders(token, version),
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      data: {
        type: "hold",
        selected_offers: [offer.id],
        passengers,
      },
    }),
  });

  return (await response.json().catch(() => ({}))) as DuffelApiResponse;
}

/**
 * Creates an order that is paid straight away. Duffel only accepts the
 * payment inside the order request for offers that require instant payment.
 */
async function createInstantOrder({
  token,
  version,
  offer,
  passengers,
}: DuffelRequestOptions): Promise<DuffelApiResponse> {
  const amount = offer.total_amount ?? "0";
  const currency = offer.total_currency ?? "USD";

  const response = await fetch("https://api.duffel.com/air/orders", {
    method: "POST",
    headers: duffelHeaders(token, version),
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      data: {
        type: "instant",
        selected_offers: [offer.id],
        passengers,
        payments: [
          {
            type: "balance",
            amount,
            currency,
          },
        ],
      },
    }),
  });

  return (await response.json().catch(() => ({}))) as DuffelApiResponse;
}

/**
 * Pays the outstanding balance of a held order. The amount has to match the
 * order total, otherwise Duffel rejects the payment.
 */
async function payForOrder({
  token,
  version,
  order,
}: {
  token: string;
  version: string;
  order: DuffelOrder;
}): Promise<DuffelApiResponse> {
  const response = await fetch("https://api.duffel.com/air/payments", {
    method: "POST",
    headers: duffelHeaders(token, version),
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      data: {
        order_id: order.id,
        payment: {
          type: "balance",
          amount: order.total_amount ?? "0",
          currency: order.total_currency ?? "USD",
        },
      },
    }),
  });

  return (await response.json().catch(() => ({}))) as DuffelApiResponse;
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

    const travelDate = getTravelDate(offer);

    if (!travelDate) {
      return NextResponse.json(
        { error: "The selected offer has no travel date." },
        { status: 409 }
      );
    }

    const { passengers, error: passengerError } = buildOrderPassengers(
      offer,
      validatedPassengers,
      travelDate
    );

    if (passengerError) {
      return NextResponse.json(
        { error: passengerError },
        { status: 400 }
      );
    }

    // Offers that need instant payment cannot be held, so they are created
    // with an instant order that pays the balance straight away.
    const requiresInstantPayment =
      offer.payment_requirements?.requires_instant_payment === true;

    const orderPayload = requiresInstantPayment
      ? await createInstantOrder({ token, version, offer, passengers })
      : await createHeldOrder({ token, version, offer, passengers });

    if (!orderPayload.data) {
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

    const order = orderPayload.data as DuffelOrder;

    // A held order still has to be paid before the tickets are issued.
    let paidAt = order.payment_status?.paid_at ?? null;

    if (order.payment_status?.awaiting_payment) {
      const payment = await payForOrder({ token, version, order });

      if (!payment.data) {
        console.error("Duffel order created but payment failed", {
          orderId: order.id,
        });

        return NextResponse.json(
          {
            error:
              "The order was created but the payment could not be completed. Contact support with this provider order ID.",
            providerOrderId: order.id,
          },
          { status: 502 }
        );
      }

      paidAt = payment.data.paid_at ?? paidAt;
    }

    const itinerarySlices = order.slices ?? offer.slices ?? [];

    // Only mark the booking as confirmed once Duffel reports it as paid.
    const bookingStatus = paidAt ? "confirmed" : "held";

    const itinerary = {
      paidAt,
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
        status: bookingStatus,
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
