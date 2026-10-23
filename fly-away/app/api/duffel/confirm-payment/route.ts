import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DuffelOrderResponse = {
  data?: any;
  errors?: any;
  status?: number;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json(
      { error: "Missing orderId" },
      { status: 400 },
    );
  }

  // Fetch the held Duffel booking so we know the Duffel order ID, amount, and currency.
  const { data: booking, error: bookingError } = await supabase
    .from("duffel_bookings")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "held")
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: "Held booking not found" },
      { status: 404 },
    );
  }

  const duffelOrderId = booking.order_id;
  const totalAmount = booking.total_amount;
  const currency = booking.currency;
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  const version = process.env.DUFFEL_VERSION;

  if (!token || !version) {
    return NextResponse.json(
      { error: "Duffel credentials not configured" },
      { status: 500 },
    );
  }

  if (!duffelOrderId) {
    return NextResponse.json(
      { error: "Booking has no Duffel order ID" },
      { status: 400 },
    );
  }

  // Call Duffel to pay for the held order.
  const paymentPayload = {
    data: {
      order_id: duffelOrderId,
      payment: {
        type: "balance",
        amount: totalAmount,
        currency,
      },
    },
  };

  const payRes = await fetch(
    `https://api.duffel.com/air/payments`,
    {
      method: "POST",
      headers: {
        "Accept-Encoding": "gzip",
        Accept: "application/json",
        "Duffel-Version": version,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentPayload),
    },
  );

  const payData = (await payRes.json()) as DuffelOrderResponse;

  if (!payRes.ok || payData.errors) {
    console.error("Duffel confirm-payment error", {
      orderId: duffelOrderId,
      status: payRes.status,
      errors: payData.errors,
    });

    // Duffel rejects payment for hold orders when the offer requires instant
    // payment. In that case the order can't be paid via this endpoint — the
    // user needs to rebook (the orders route creates instant orders for such
    // offers automatically).
    const needsRebook = payData.errors?.some(
      (e: any) => e.code === "order_type_not_eligible_for_payment",
    );

    return NextResponse.json(
      {
        error: needsRebook
          ? "This booking requires instant payment and cannot be confirmed via this flow. Please search again and create a new booking."
          : "Payment confirmation failed",
        details: payData.errors ?? payRes.statusText,
        needsRebook,
      },
      { status: 502 },
    );
  }

  const paidAt = payData.data?.payment?.paid_at ?? new Date().toISOString();

  // Update the booking status to confirmed and record paidAt in itinerary.
  const itinerary = {
    ...(booking.itinerary as object ?? {}),
    paidAt,
    paymentConfirmedAt: new Date().toISOString(),
  };

  const { data: updatedBooking, error: updateError } = await supabase
    .from("duffel_bookings")
    .update({
      status: "confirmed",
      itinerary,
    })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .select("id, order_id, status, booking_reference, total_amount, currency, created_at")
    .single();

  if (updateError || !updatedBooking) {
    return NextResponse.json(
      {
        error:
          "Duffel confirmed the payment, but updating your booking status failed.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    booking: updatedBooking,
  });
}
