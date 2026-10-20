"use client";

import Navbar from "@/components/layout/navbar";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFlightStore } from "@/store/flight-store";
import type { PassengerForm } from "@/types/passenger";

type DuffelOrderResult = {
  success?: boolean;
  booking?: {
    id: string;
    order_id: string | null;
    booking_reference: string | null;
    status: string;
    total_amount: string | number | null;
    currency: string | null;
  };
  error?: string;
};

type DuffelTitle = "mr" | "mrs" | "ms" | "miss";
type DuffelGender = "m" | "f";

type DuffelPassengerForm = {
  givenName: string;
  familyName: string;
  dob: string;
  title: DuffelTitle;
  gender: DuffelGender;
  email: string;
  phoneNumber: string;
};

function createEmptyDuffelPassenger(): DuffelPassengerForm {
  return {
    givenName: "",
    familyName: "",
    dob: "",
    title: "mr",
    gender: "m",
    email: "",
    phoneNumber: "",
  };
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDuffel = searchParams.get("provider") === "duffel";
  const offerId = searchParams.get("offerId") ?? "";

  const searchQuery = useFlightStore((s) => s.searchQuery);
  const selectedFlight = useFlightStore((s) => s.selectedFlight);
  const selectedSeats = useFlightStore((s) => s.selectedSeats);
  const passengerForms = useFlightStore((s) => s.passengerFormData);
  const setPassengerFormData = useFlightStore((s) => s.setPassengerFormData);
  const setBookingStep = useFlightStore((s) => s.setBookingStep);

  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<DuffelOrderResult | null>(null);
  const [duffelPassengers, setDuffelPassengers] = useState<DuffelPassengerForm[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const passengerCount = Math.max(
    1,
    Math.min(
      9,
      Number(
        searchParams.get("passengers") ?? searchQuery.passengers ?? 1
      )
    )
  );

  const adults = Math.max(1, Number(searchParams.get("adults") ?? 1));

  const childAges = useMemo(
    () =>
      (searchParams.get("childrenAges") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number),
    [searchParams]
  );

  const infantAges = useMemo(
    () =>
      (searchParams.get("infantAges") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number),
    [searchParams]
  );

  const passengerLabels = useMemo(
    () => [
      ...Array.from({ length: adults }, () => "Adult"),
      ...childAges.map((age) => `Child · age ${age}`),
      ...infantAges.map((age) => `Infant · age ${age}`),
    ],
    [adults, childAges, infantAges]
  );

  const flightId =
    searchParams.get("flightId") ?? selectedFlight?.id ?? "";
  const seatId =
    searchParams.get("seatId") ?? selectedSeats[0]?.id ?? "";

  // Duffel uses isolated local form state, preserving demo passenger data.
  useEffect(() => {
    setDuffelPassengers((current) =>
      Array.from({ length: passengerCount }, (_, index) =>
        current[index] ?? createEmptyDuffelPassenger()
      )
    );
  }, [passengerCount]);

  // Preserve the existing local/demo passenger form behavior.
  useEffect(() => {
    if (isDuffel) return;

    const defaults: PassengerForm[] = Array.from(
      { length: passengerCount },
      (_, index) => {
        const existing = passengerForms[index];

        if (!existing) {
          return {
            fullName: "",
            givenName: "",
            familyName: "",
            passportNo: "",
            nationality: "",
            dob: "",
          };
        }

        if (existing.givenName || existing.familyName) {
          return existing;
        }

        const parts = (existing.fullName ?? "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        return {
          ...existing,
          givenName: parts.slice(0, -1).join(" "),
          familyName: parts.length > 0 ? parts[parts.length - 1] : "",
        };
      }
    );

    if (
      passengerForms.length !== passengerCount ||
      defaults.some(
        (p) => p.givenName === undefined || p.familyName === undefined
      )
    ) {
      setPassengerFormData(
        defaults.map((p) => ({
          ...p,
          givenName: p.givenName ?? "",
          familyName: p.familyName ?? "",
        }))
      );
    }
  }, [
    isDuffel,
    passengerCount,
    passengerForms,
    setPassengerFormData,
  ]);

  function updateDemoPassenger(
    index: number,
    field: keyof PassengerForm,
    value: string
  ) {
    const updated = Array.from(
      { length: passengerCount },
      (_, i) =>
        passengerForms[i] ?? {
          fullName: "",
          givenName: "",
          familyName: "",
          passportNo: "",
          nationality: "",
          dob: "",
        }
    );

    updated[index] = { ...updated[index], [field]: value };
    setPassengerFormData(updated);
  }

  function updateDuffelPassenger(
    index: number,
    field: keyof DuffelPassengerForm,
    value: string
  ) {
    setDuffelPassengers((current) =>
      Array.from({ length: passengerCount }, (_, i) => {
        const passenger = current[i] ?? createEmptyDuffelPassenger();

        if (i !== index) return passenger;

        return { ...passenger, [field]: value };
      })
    );
  }

  async function handleContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;

    if (isDuffel) {
      if (!offerId) {
        toast.error("Missing Duffel offer. Please select a flight again.");
        return;
      }

      if (duffelPassengers.length !== passengerCount) {
        toast.error("Passenger forms are still loading. Please try again.");
        return;
      }

      for (let i = 0; i < duffelPassengers.length; i++) {
        const p = duffelPassengers[i];

        if (
          !p.givenName.trim() ||
          !p.familyName.trim() ||
          !p.dob ||
          !p.email.trim() ||
          !p.phoneNumber.trim()
        ) {
          toast.error(
            `Passenger ${i + 1}: complete names, date of birth, email, and phone number.`
          );
          return;
        }
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
      ) {
        toast.error("Enter a valid booking contact email.");
        return;
      }

      if (!/^\+[1-9]\d{7,14}$/.test(contactPhone.trim())) {
        toast.error(
          "Enter the booking contact phone in international format, e.g. +923001234567."
        );
        return;
      }

      // This route currently requires email and phone on each passenger.
      // The booking contact values are copied to each passenger as defaults.
      const passengersPayload = duffelPassengers.map((p) => ({
        givenName: p.givenName.trim(),
        familyName: p.familyName.trim(),
        dob: p.dob,
        title: p.title,
        gender: p.gender,
        email: p.email.trim() || contactEmail.trim(),
        phoneNumber: p.phoneNumber.trim() || contactPhone.trim(),
      }));

      setSubmitting(true);

      try {
        const response = await fetch("/api/duffel/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            passengers: passengersPayload,
          }),
        });

        const result =
          (await response.json()) as DuffelOrderResult;

        if (!response.ok) {
          throw new Error(
            result.error ?? "Duffel order creation failed."
          );
        }

        setOrderResult(result);
        toast.success("Duffel order created.");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Duffel order creation failed."
        );
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // Existing local/demo flow: retain its current validation and navigation.
    const forms = Array.from(
      { length: passengerCount },
      (_, i) => passengerForms[i]
    );

    for (let i = 0; i < forms.length; i++) {
      const p = forms[i];

      if (!p) {
        toast.error(`Passenger ${i + 1}: details required`);
        return;
      }

      if (
        !(p.givenName?.trim() || p.fullName?.trim()) ||
        !(p.familyName?.trim() || p.fullName?.trim())
      ) {
        toast.error(`Passenger ${i + 1}: name required`);
        return;
      }

      if (!p.dob) {
        toast.error(`Passenger ${i + 1}: date of birth required`);
        return;
      }

      if (!p.passportNo?.trim() || !p.nationality?.trim()) {
        toast.error(
          `Passenger ${i + 1}: passport and nationality required`
        );
        return;
      }
    }

    setBookingStep("payment");

    router.push(
      `/payment?flightId=${encodeURIComponent(
        flightId
      )}&seatId=${encodeURIComponent(seatId)}`
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-white p-8 shadow-lg dark:bg-slate-900">
          <h1 className="text-4xl font-bold">Passenger Details</h1>

          <p className="mt-2 text-slate-500">
            {isDuffel
              ? `Duffel offer ${offerId} · ${passengerCount} passenger(s)`
              : `Fill details for ${passengerCount} passenger(s)`}
          </p>

          {isDuffel && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Test-mode order flow. No payment is collected here. Order
              creation is available only when Duffel confirms that the
              offer can be held without instant payment.
            </p>
          )}

          {orderResult?.booking ? (
            <section className="mt-8 rounded-2xl border border-green-300 p-6">
              <h2 className="text-2xl font-bold">
                Duffel order created
              </h2>

              <p className="mt-3">
                Status: <strong>{orderResult.booking.status}</strong>
              </p>

              <p>
                Booking reference:{" "}
                <strong>
                  {orderResult.booking.booking_reference ??
                    "Not provided by provider"}
                </strong>
              </p>

              <p>
                Order ID:{" "}
                <span className="break-all">
                  {orderResult.booking.order_id}
                </span>
              </p>

              <p>
                Total: {orderResult.booking.total_amount ?? "—"}{" "}
                {orderResult.booking.currency ?? ""}
              </p>

              <p className="mt-3 text-sm text-slate-500">
                This is a held test-mode order. Payment is not implemented.
              </p>

              <button
                type="button"
                onClick={() => router.push("/my-bookings")}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                View my bookings
              </button>
            </section>
          ) : (
            <form
              onSubmit={handleContinue}
              className="mt-8 space-y-10"
            >
              {isDuffel && (
                <section className="rounded-3xl border p-6">
                  <h2 className="mb-5 text-2xl font-bold">
                    Booking contact
                  </h2>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Contact email
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="mt-2 w-full rounded-2xl border p-4"
                      />
                    </label>

                    <label className="text-sm font-medium">
                      Contact phone
                      <input
                        required
                        type="tel"
                        autoComplete="tel"
                        placeholder="+923001234567"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="mt-2 w-full rounded-2xl border p-4"
                      />
                    </label>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Each passenger also has contact fields below. Booking
                    contact details are used as fallbacks if a passenger's
                    own email or phone is left blank.
                  </p>
                </section>
              )}

              {Array.from({ length: passengerCount }, (_, index) => {
                if (isDuffel) {
                  const passenger =
                    duffelPassengers[index] ??
                    createEmptyDuffelPassenger();

                  return (
                    <section
                      key={index}
                      className="rounded-3xl border p-6"
                    >
                      <h2 className="mb-5 text-2xl font-bold">
                        Passenger {index + 1}
                        {passengerLabels[index]
                          ? ` · ${passengerLabels[index]}`
                          : ""}
                      </h2>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="text-sm font-medium">
                          Title
                          <select
                            required
                            value={passenger.title}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "title",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border bg-white p-4"
                          >
                            <option value="mr">Mr</option>
                            <option value="mrs">Mrs</option>
                            <option value="ms">Ms</option>
                            <option value="miss">Miss</option>
                          </select>
                        </label>

                        <label className="text-sm font-medium">
                          Gender
                          <select
                            required
                            value={passenger.gender}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "gender",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border bg-white p-4"
                          >
                            <option value="m">Male</option>
                            <option value="f">Female</option>
                          </select>
                        </label>

                        <label className="text-sm font-medium">
                          Given name(s)
                          <input
                            required
                            autoComplete="given-name"
                            value={passenger.givenName}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "givenName",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border p-4"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Family name
                          <input
                            required
                            autoComplete="family-name"
                            value={passenger.familyName}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "familyName",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border p-4"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Date of birth
                          <input
                            required
                            type="date"
                            value={passenger.dob}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "dob",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-2xl border p-4"
                          />
                        </label>

                        <label className="text-sm font-medium">
                          Passenger email
                          <input
                            type="email"
                            autoComplete="email"
                            value={passenger.email}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "email",
                                e.target.value
                              )
                            }
                            placeholder={contactEmail || "name@example.com"}
                            className="mt-2 w-full rounded-2xl border p-4"
                          />
                        </label>

                        <label className="text-sm font-medium sm:col-span-2">
                          Passenger phone
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={passenger.phoneNumber}
                            onChange={(e) =>
                              updateDuffelPassenger(
                                index,
                                "phoneNumber",
                                e.target.value
                              )
                            }
                            placeholder={contactPhone || "+923001234567"}
                            className="mt-2 w-full rounded-2xl border p-4"
                          />
                        </label>
                      </div>
                    </section>
                  );
                }

                const passenger = passengerForms[index] ?? {
                  fullName: "",
                  givenName: "",
                  familyName: "",
                  passportNo: "",
                  nationality: "",
                  dob: "",
                };

                return (
                  <section
                    key={index}
                    className="rounded-3xl border p-6"
                  >
                    <h2 className="mb-5 text-2xl font-bold">
                      Passenger {index + 1}
                    </h2>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Given name(s)
                        <input
                          required
                          autoComplete="given-name"
                          value={passenger.givenName ?? ""}
                          onChange={(e) =>
                            updateDemoPassenger(
                              index,
                              "givenName",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border p-4"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Family name
                        <input
                          required
                          autoComplete="family-name"
                          value={passenger.familyName ?? ""}
                          onChange={(e) =>
                            updateDemoPassenger(
                              index,
                              "familyName",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border p-4"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Date of birth
                        <input
                          required
                          type="date"
                          value={passenger.dob}
                          onChange={(e) =>
                            updateDemoPassenger(index, "dob", e.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border p-4"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Passport number
                        <input
                          required
                          value={passenger.passportNo}
                          onChange={(e) =>
                            updateDemoPassenger(
                              index,
                              "passportNo",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border p-4"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Nationality
                        <input
                          required
                          value={passenger.nationality}
                          onChange={(e) =>
                            updateDemoPassenger(
                              index,
                              "nationality",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-2xl border p-4"
                        />
                      </label>
                    </div>
                  </section>
                );
              })}

              <button
                disabled={submitting}
                type="submit"
                className="w-full rounded-2xl bg-blue-600 py-5 text-lg font-semibold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Validating offer and creating order…"
                  : isDuffel
                    ? "Validate offer and create test order"
                    : "Continue to Payment"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
