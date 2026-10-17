import type { Booking } from "./booking";
import type { Flight } from "./flight";
import type { Seat } from "./seat";
import type { PassengerForm } from "./passenger";


export type SearchQuery = {
  from: string;
  to: string;
  date: string;
  passengers: number;
  adults: number;
  childrenAges: number[];
  infantAges: number[];

  flightClass: "economy" | "business" | "first";
};


export type BookingStep =
  | "search"
  | "selectSeat"
  | "passengerDetails"
  | "payment"
  | "confirmation";

export type SelectedFlight = Partial<Flight> & {
  id: string;
  flight_no: string;
  origin: string;
  destination: string;
  base_price: number;
};

export type FlightStoreState = {
  searchQuery: SearchQuery;
  selectedFlight: SelectedFlight | null;
  selectedSeats: Seat[];
  bookingStep: BookingStep;
  passengerFormData: PassengerForm[];
  setSearchQuery: (query: Partial<SearchQuery>) => void;
  setSelectedFlight: (flight: SelectedFlight | null) => void;
  setSelectedSeats: (seats: Seat[]) => void;
  toggleSeatSelection: (seat: Seat) => void;
  setBookingStep: (step: BookingStep) => void;
  setPassengerFormData: (forms: PassengerForm[]) => void;
  updatePassengerForm: (
    index: number,
    field: keyof PassengerForm,
    value: string,
  ) => void;
  resetBooking: () => void;
  resetStore: () => void;
};

export type UserStoreState = {
  sessionToken: string | null;
  user: {
    id: string;
    email?: string | null;
  } | null;
  cachedBookings: Booking[];
  setSessionToken: (token: string | null) => void;
  setUser: (user: UserStoreState["user"]) => void;
  setCachedBookings: (bookings: Booking[]) => void;
  resetStore: () => void;
};
