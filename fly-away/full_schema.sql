


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cancel_booking"("p_booking_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_seat_id uuid;
  v_booking_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  update public.bookings b
     set status = 'cancelled'
   where b.id = p_booking_id
     and b.user_id = auth.uid()
     and b.status in ('confirmed', 'rescheduled')
  returning b.seat_id into v_seat_id;

  get diagnostics v_booking_updated = row_count;

  if v_booking_updated <> 1 then
    return false;
  end if;

  if v_seat_id is not null then
    update public.seats s
       set is_available = true
     where s.id = v_seat_id
       and not exists (
         select 1
           from public.bookings b
          where b.seat_id = s.id
            and b.status in ('confirmed', 'rescheduled')
       );
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."cancel_booking"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_seat"("p_seat_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  rows_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  update public.seats s
     set is_available = false
   where s.id = p_seat_id
     and s.is_available = true
     and exists (
       select 1
         from public.flights f
        where f.id = s.flight_id
          and f.status <> 'cancelled'
     );

  get diagnostics rows_updated = row_count;
  return rows_updated = 1;
end;
$$;


ALTER FUNCTION "public"."lock_seat"("p_seat_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "flight_id" "uuid" NOT NULL,
    "seat_id" "uuid",
    "status" "text" DEFAULT 'confirmed'::"text",
    "booked_at" timestamp with time zone DEFAULT "now"(),
    "total_price" numeric(10,2) NOT NULL,
    "pnr_code" "text" NOT NULL,
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['confirmed'::"text", 'rescheduled'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flight_no" "text" NOT NULL,
    "origin" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "departs_at" timestamp with time zone NOT NULL,
    "arrives_at" timestamp with time zone NOT NULL,
    "aircraft_type" "text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text",
    "base_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "flights_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'delayed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."flights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passengers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "passport_no" "text" NOT NULL,
    "nationality" "text" NOT NULL,
    "dob" "date" NOT NULL
);


ALTER TABLE "public"."passengers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reschedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "old_flight_id" "uuid" NOT NULL,
    "new_flight_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "fee_charged" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."reschedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flight_id" "uuid" NOT NULL,
    "seat_number" "text" NOT NULL,
    "class" "text" NOT NULL,
    "is_available" boolean DEFAULT true,
    "extra_fee" numeric(10,2) DEFAULT 0,
    CONSTRAINT "seats_class_check" CHECK (("class" = ANY (ARRAY['economy'::"text", 'business'::"text", 'first'::"text"])))
);


ALTER TABLE "public"."seats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pnr_code_key" UNIQUE ("pnr_code");



ALTER TABLE ONLY "public"."flights"
    ADD CONSTRAINT "flights_flight_no_key" UNIQUE ("flight_no");



ALTER TABLE ONLY "public"."flights"
    ADD CONSTRAINT "flights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passengers"
    ADD CONSTRAINT "passengers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reschedules"
    ADD CONSTRAINT "reschedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_flight_id_seat_number_key" UNIQUE ("flight_id", "seat_number");



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "public"."flights"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."passengers"
    ADD CONSTRAINT "passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reschedules"
    ADD CONSTRAINT "reschedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reschedules"
    ADD CONSTRAINT "reschedules_new_flight_id_fkey" FOREIGN KEY ("new_flight_id") REFERENCES "public"."flights"("id");



ALTER TABLE ONLY "public"."reschedules"
    ADD CONSTRAINT "reschedules_old_flight_id_fkey" FOREIGN KEY ("old_flight_id") REFERENCES "public"."flights"("id");



ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "public"."flights"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_booking"("p_booking_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."lock_seat"("p_seat_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lock_seat"("p_seat_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_seat"("p_seat_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."flights" TO "anon";
GRANT ALL ON TABLE "public"."flights" TO "authenticated";
GRANT ALL ON TABLE "public"."flights" TO "service_role";



GRANT ALL ON TABLE "public"."passengers" TO "anon";
GRANT ALL ON TABLE "public"."passengers" TO "authenticated";
GRANT ALL ON TABLE "public"."passengers" TO "service_role";



GRANT ALL ON TABLE "public"."reschedules" TO "anon";
GRANT ALL ON TABLE "public"."reschedules" TO "authenticated";
GRANT ALL ON TABLE "public"."reschedules" TO "service_role";



GRANT ALL ON TABLE "public"."seats" TO "anon";
GRANT ALL ON TABLE "public"."seats" TO "authenticated";
GRANT ALL ON TABLE "public"."seats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































