-- =============================================================================
-- ABUNDANCE CODE — El idioma en el que se compró
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede volver a ejecutar sin romper nada.
--
-- Andrea quiere saber quién llegó en inglés y quién en español. El dato ya se
-- conocía en el momento de abrir el pago —de ahí sale el idioma del checkout,
-- del correo de acceso y del enlace al portal— pero no se guardaba en ninguna
-- parte que sobreviviera a la compra: viajaba en los metadatos de la sesión de
-- Stripe y ahí se quedaba.
--
-- Guardado aquí, el idioma es una propiedad de la compra y se puede contar,
-- filtrar y mirar un año después sin salir a pedírselo a Stripe.
--
-- El relleno de abajo recupera lo que ya está en `checkout_attempts`, que sí lo
-- anota desde el 3 de octubre de 2026. Lo anterior se queda en nulo: no se
-- inventa un idioma que nadie registró. En el panel eso se lee «—», que es la
-- verdad, y no «español», que sería una suposición cómoda.
-- =============================================================================

alter table public.subscriptions
  add column if not exists locale text;

alter table public.subscriptions
  drop constraint if exists subscriptions_locale_check;

alter table public.subscriptions
  add constraint subscriptions_locale_check
  check (locale is null or locale in ('es', 'en'));

comment on column public.subscriptions.locale is
  'Idioma en el que se hizo la compra. Null = compra anterior a que se guardara.';

-- Lo que ya se sabe, por la sesión de Stripe que comparten las dos tablas.
update public.subscriptions s
   set locale = a.locale
  from public.checkout_attempts a
 where a.stripe_session_id = s.stripe_session_id
   and a.locale is not null
   and s.locale is null;

-- Para contar por idioma sin recorrer la tabla entera.
create index if not exists subscriptions_locale_idx
  on public.subscriptions (locale);
