
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Verify the signed-in user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Read the booking ID from the request body
    const body = await req.json();
    const bookingId = body.bookingId;

    if (
      typeof bookingId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
    ) {
      return NextResponse.json(
        { error: "A valid booking ID is required" },
        { status: 400 }
      );
    }

    // Call the PostgreSQL function (legacy bookings)
    const { data: legacyData, error: legacyError } = await supabase.rpc(
      "cancel_booking",
      { p_booking_id: bookingId }
    );

    // If the legacy RPC succeeded, we're done.
    if (!legacyError && legacyData) {
      return NextResponse.json({ success: true });
    }

    // Otherwise fall back to the Duffel bookings table.
    const { data: duffelData, error: duffelError } = await supabase
      .from("duffel_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .select("id");

    if (duffelError || !duffelData?.length) {
      const message = duffelError?.message || "Booking not found in Duffel orders";
      console.error("Cancellation failed:", message);

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancellation route error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
