import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Seat } from "@/types/seat";
import type { PassengerForm } from "@/types/passenger";
import type {
  FlightStoreState,
  SearchQuery,
  SelectedFlight,
} from "@/types/store";

const initialSearchQuery: SearchQuery = {
  from: "",
  to: "",
  date: "",
  passengers: 1,
  adults: 1,
  childrenAges: [],
  infantAges: [],
  flightClass: "economy",
};

const initialFlightStoreState: Pick<
  FlightStoreState,
  | "searchQuery"
  | "selectedFlight"
  | "selectedSeats"
  | "bookingStep"
  | "passengerFormData"
> = {
  searchQuery: initialSearchQuery,
  selectedFlight: null,
  selectedSeats: [],
  bookingStep: "search",
  passengerFormData: [],
};

export const useFlightStore = create<FlightStoreState>()(
  persist(
    (set) => ({
      ...initialFlightStoreState,

      setSearchQuery: (query) =>
        set((state) => ({
          searchQuery: {
            ...state.searchQuery,
            ...query,
          },
        })),

      setSelectedFlight: (flight) =>
        set({
          selectedFlight: flight,
        }),

      setSelectedSeats: (seats) =>
        set({
          selectedSeats: seats,
        }),

      toggleSeatSelection: (seat) =>
        set((state) => {
          const exists = state.selectedSeats.some(
            (selected) => selected.id === seat.id,
          );

          if (exists) {
            return {
              selectedSeats: state.selectedSeats.filter(
                (selected) => selected.id !== seat.id,
              ),
            };
          }

          return {
            selectedSeats: [...state.selectedSeats, seat],
          };
        }),

      setBookingStep: (step) =>
        set({
          bookingStep: step,
        }),

      setPassengerFormData: (forms) =>
        set({
          passengerFormData: forms,
        }),

      updatePassengerForm: (index, field, value) =>
        set((state) => {
          const updatedForms = [...state.passengerFormData];

          if (!updatedForms[index]) {
            return state;
          }

          updatedForms[index] = {
            ...updatedForms[index],
            [field]: value,
          };

          return {
            passengerFormData: updatedForms,
          };
        }),

      resetBooking: () =>
        set({
          selectedFlight: null,
          selectedSeats: [],
          bookingStep: "search",
          passengerFormData: [],
        }),

      resetStore: () =>
        set({
          ...initialFlightStoreState,
        }),
    }),
    {
      name: "flyaway-flight-store",
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedFlight: state.selectedFlight,
        selectedSeats: state.selectedSeats,
        bookingStep: state.bookingStep,
        passengerFormData: state.passengerFormData.map(
          ({ fullName, nationality, dob }) => ({
            fullName,
            nationality,
            dob,
            passportNo: "",
          }),
        ),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | Partial<FlightStoreState>
          | undefined;
        const persistedSearchQuery = persisted?.searchQuery as
          | Partial<SearchQuery>
          | undefined;

        return {
          ...currentState,
          ...persisted,
          searchQuery: {
            ...initialSearchQuery,
            ...persistedSearchQuery,
            adults:
              persistedSearchQuery?.adults ??
              persistedSearchQuery?.passengers ??
              initialSearchQuery.adults,
          },
        };
      },
    },
  ),
);
