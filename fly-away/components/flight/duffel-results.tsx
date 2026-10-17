
"use client";

import { useEffect, useState } from "react";

type DuffelSegment = {
  airline?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  departingAt?: string;
  arrivingAt?: string;
};

type DuffelOffer = {
  id: string;
  totalAmount: string;
  currency: string;
  expiresAt?: string;
  owner?: string;
  slices: {
    origin?: string;
    destination?: string;
    segments: DuffelSegment[];
  }[];
};

type Props = {
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
  adults: number;
  childrenAges: number[];
  infantAges: number[];
  cabinClass: string;
};

export default function DuffelResults({
  origin,
  destination,
  departureDate,
  passengers,
  adults,
  childrenAges,
  infantAges,
  cabinClass,
}: Props) {
  const [offers, setOffers] = useState<DuffelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<DuffelOffer | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function search() {
      if (!origin || !destination || !departureDate) {
        setOffers([]);
        setSelectedOffer(null);
        setError("Choose origin, destination, and departure date.");
        return;
      }

      setLoading(true);
      setError("");
      setOffers([]);
      setSelectedOffer(null);
      setLiveMode(null);

      try {
        const response = await fetch("/api/flights/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            origin,
            destination,
            departureDate,
            passengers,
            adults,
            childrenAges,
            infantAges,
            cabinClass,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Flight search failed.");
        }

        setOffers(result.offers ?? []);
        setLiveMode(result.liveMode ?? false);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Flight search failed."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void search();

    return () => controller.abort();
  }, [
    origin,
    destination,
    departureDate,
    passengers,
    adults,
    childrenAges,
    infantAges,
    cabinClass,
  ]);

  function formatTime(value?: string) {
    if (!value) return "Time unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Time unavailable";

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <section className="mt-10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Duffel Flight Offers</h2>
          <p className="mt-1 text-sm text-slate-500">
            {origin} → {destination} · {passengers} passenger(s)
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
          {liveMode === false ? "Test-mode search" : "Provider offers"}
        </span>
      </div>

      {liveMode === false && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          These are simulated test-environment offers, not confirmed
          real-world flight availability.
        </p>
      )}

      {loading && <p>Searching Duffel for flight offers…</p>}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <div className="rounded-2xl bg-white p-8 shadow dark:bg-slate-900">
          No offers were returned. Try another route or date.
        </div>
      )}

      {offers.map((offer) => (
        <article
          key={offer.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">
                {offer.owner ?? "Airline"}
              </h3>
              <p className="text-sm text-slate-500">
                {offer.slices.length} flight slice(s) · {cabinClass}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold">
                {offer.totalAmount} {offer.currency}
              </p>
              <p className="text-xs text-slate-500">
                Price returned by Duffel
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {offer.slices.map((slice, index) => (
              <div
                key={`${offer.id}-${index}`}
                className="border-t border-slate-200 pt-4 dark:border-slate-700"
              >
                <p className="font-semibold">
                  {slice.origin ?? "Origin"} →{" "}
                  {slice.destination ?? "Destination"}
                </p>

                {slice.segments.map((segment, segmentIndex) => (
                  <div
                    key={`${offer.id}-${index}-${segmentIndex}`}
                    className="mt-3 text-sm"
                  >
                    <p>
                      {segment.airline ?? "Airline"}
                      {segment.flightNumber
                        ? ` · Flight ${segment.flightNumber}`
                        : ""}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {segment.origin ?? "—"} →{" "}
                      {segment.destination ?? "—"}
                    </p>
                    <p className="text-slate-500">
                      Departs: {formatTime(segment.departingAt)}
                    </p>
                    <p className="text-slate-500">
                      Arrives: {formatTime(segment.arrivingAt)}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Offer ID: {offer.id}
            {offer.expiresAt
              ? ` · Expires: ${formatTime(offer.expiresAt)}`
              : ""}
          </p>

          <button
            type="button"
            onClick={() => setSelectedOffer(offer)}
            className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Select Flight
          </button>

          {selectedOffer?.id === offer.id && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-slate-800">
              <h4 className="font-semibold">Flight selected</h4>
              <p className="mt-2 text-sm">
                {offer.owner ?? "Airline"} · {offer.totalAmount}{" "}
                {offer.currency}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                Offer reference: {offer.id}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                This offer is selected locally. No booking or payment has
                been created yet.
              </p>
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-600"
              >
                Change selection
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
