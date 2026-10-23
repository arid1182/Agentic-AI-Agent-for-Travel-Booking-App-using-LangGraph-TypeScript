import Image from "next/image";
import Navbar from "@/components/layout/navbar";
import LocationWeather from "@/components/weather/location-weather";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <section
          className="
          relative overflow-hidden
          px-5 py-14
          lg:min-h-[90vh]
          lg:px-8
        "
        >
          <div
            className="
            mx-auto grid
            max-w-7xl
            items-center gap-12
            lg:grid-cols-2
          "
          >
            {/* LEFT */}
            <div>
              <span
                className="
                rounded-full
                bg-blue-100
                px-4 py-2
                text-sm font-medium
                text-blue-700
                dark:bg-blue-950
                dark:text-blue-300
              "
              >
                ✈ Fly Smarter
              </span>

              <h1
                className="
                mt-6 text-5xl
                font-extrabold
                leading-tight
                md:text-6xl
              "
              >
                Explore the World With Confidence
              </h1>

              <p
                className="
                mt-6 max-w-lg
                text-lg
                text-slate-600
                dark:text-slate-400
              "
              >
                Book flights with the best prices, seamless booking experience,
                and premium comfort.
              </p>

              <div
                className="
                mt-8 flex
                flex-col gap-4
                sm:flex-row
              "
              >
                <Link
                  href="/flights"
                  className="
                  rounded-2xl
                  bg-blue-600
                  px-8 py-4
                  text-center
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-700
                "
                >
                  Search Flights
                </Link>

                <button
                  className="
                  rounded-2xl
                  border
                  border-slate-300
                  px-8 py-4
                  font-semibold
                  transition
                  hover:bg-slate-100
                  dark:border-slate-700
                  dark:hover:bg-slate-900
                "
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative">
              <Image
                src="/images/hero-flight.avif"
                alt="Flight"
                loading="lazy"
                width={700}
                height={700}
                className="
                w-full object-contain
              "
              />
            </div>
          </div>
        </section>

        {/* DESTINATION WEATHER */}
        <section className="px-5 pb-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2
              className="
              text-center text-3xl font-bold
            "
            >
              Check the weather before you fly
            </h2>

            <p
              className="
              mx-auto mt-3 max-w-xl text-center
              text-slate-600
              dark:text-slate-400
            "
            >
              Search any city worldwide to see the forecast for your
              destination.
            </p>

            <div className="mt-8">
              <LocationWeather />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
