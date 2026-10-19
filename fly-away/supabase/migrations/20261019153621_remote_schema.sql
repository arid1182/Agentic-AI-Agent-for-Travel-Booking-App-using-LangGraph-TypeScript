SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cancel_booking (
  p_booking_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."cancel_booking"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.lock_seat (
  p_seat_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."lock_seat"(uuid) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."cancel_booking"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."cancel_booking"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_booking"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."cancel_booking"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."lock_seat"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."lock_seat"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."lock_seat"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."lock_seat"(uuid) TO "service_role";

