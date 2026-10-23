import type { Flight } from "./flight";
import type { Seat } from "./seat";

export type Booking = {
  id: string;
  user_id: string;
  flight_id: string;
  seat_id: string;

  status: "confirmed" | "rescheduled" | "cancelled" | "held";

  booked_at: string;

  total_price: number;

  pnr_code: string;
};

export type BookingCard = Booking & {
  flight?: Flight;
  seat?: Seat;
};
